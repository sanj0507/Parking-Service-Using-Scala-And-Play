import {
  Box, Button, Divider, Flex, FormControl, FormLabel,
  Grid, GridItem, HStack, Icon, Input, Select, SimpleGrid,
  Stack, Text, VStack, useToast
} from "@chakra-ui/react";
import {
  BadgeCheck, BellRing, Car, CarFront, CheckCircle2,
  Clock, CircleDot, KeyRound, LogOut, ParkingCircle,
  RefreshCw, ShieldCheck, Timer, TrendingUp,
  UserRoundCheck, Wrench, Zap, ArrowRight
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { parkingApi } from "./api/parkingApi.js";
import Login from "./Login.jsx";

/* ─── Palette ────────────────────────────────────────────────── */
const C = {
  bg: "#f0f3f8",
  surface: "#ffffff",
  faint: "#f7f8fb",
  border: "#e4e7f0",
  borderFocus: "#bdc3d8",
  text: "#0f1623",
  sub: "#4b5568",
  muted: "#8a92a8",

  sidebar: "#0f1623",
  sidebarSub: "#1c2540",
  sidebarLine: "#253045",
  sidebarMuted: "#5a6480",
  sidebarText: "#c8d0e4",

  blue: "#2563eb", blueSoft: "#eff6ff",
  teal: "#0d9488", tealSoft: "#f0fdfa",
  amber: "#d97706", amberSoft: "#fffbeb",
  indigo: "#6366f1", indigoSoft: "#eef2ff",
  green: "#16a34a", greenSoft: "#f0fdf4",
  gray: "#6b7280", graySoft: "#f9fafb",
  red: "#dc2626", redSoft: "#fef2f2",
};

/* ─── Status map ─────────────────────────────────────────────── */
const STATUS = {
  RequestedCheckIn: { label: "Check-In Req", color: C.teal, soft: C.tealSoft },
  CheckedIn: { label: "Checked In", color: C.blue, soft: C.blueSoft },
  Requested: { label: "Requested", color: C.blue, soft: C.blueSoft },
  RequestedCheckout: { label: "Checkout Req", color: C.blue, soft: C.blueSoft },
  Acknowledged: { label: "Acknowledged", color: C.amber, soft: C.amberSoft },
  InProgress: { label: "In Progress", color: C.amber, soft: C.amberSoft },
  Ready: { label: "Ready", color: C.green, soft: C.greenSoft },
  AddOn: { label: "Add-on", color: C.indigo, soft: C.indigoSoft },
  RequestedAddOn: { label: "Add-on", color: C.indigo, soft: C.indigoSoft },
  AddOnInProgress: { label: "Add-On Active", color: C.indigo, soft: C.indigoSoft },
  AddOnCompleted: { label: "Add-On Done", color: C.green, soft: C.greenSoft },
  CheckedOut: { label: "Checked Out", color: C.gray, soft: C.graySoft },
};

/* ─── Timeline steps ─────────────────────────────────────────── */
const STEPS = [
  { key: "RequestedCheckIn", label: "Requested", icon: BellRing, desc: "Check-in submitted" },
  { key: "CheckedIn", label: "Checked In", icon: Car, desc: "Entered lot" },
  { key: "Acknowledged", label: "Acknowledged", icon: BadgeCheck, desc: "Valet confirmed" },
  { key: "InProgress", label: "In Service", icon: Wrench, desc: "Service underway" },
  { key: "Ready", label: "Ready", icon: CheckCircle2, desc: "Awaiting pickup" },
  { key: "RequestedCheckout", label: "Checkout Req", icon: BellRing, desc: "Customer on way" },
  { key: "CheckedOut", label: "Departed", icon: LogOut, desc: "Left lot" },
];

/* ─── Constants ──────────────────────────────────────────────── */
const TOTAL = 50;
const ADD_ONS = ["Car Service", "Washing", "Cleaning"];

// Each zone owns a set of statuses — vehicles are routed by their current status
const ZONES = [
  { key: "A", label: "Entry Row", range: [1, 10], statuses: ["RequestedCheckIn", "CheckedIn"], color: C.blue },
  { key: "B", label: "Service Bay", range: [11, 20], statuses: ["Acknowledged", "InProgress"], color: C.amber },
  { key: "C", label: "Wash Lane", range: [21, 30], statuses: ["AddOn", "AddOnInProgress", "AddOnCompleted"], color: C.indigo },
  { key: "D", label: "Ready Lane", range: [31, 40], statuses: ["Ready", "Requested", "RequestedCheckout"], color: C.green },
  { key: "E", label: "Exit Row", range: [41, 50], statuses: ["CheckedOut"], color: C.gray },
];

const NAV = [
  { key: "user", label: "Service Advisor", icon: UserRoundCheck, color: C.blue, path: "/advisor" },
  { key: "valet", label: "Valet", icon: KeyRound, color: C.teal, path: "/valet" },
  { key: "admin", label: "Admin", icon: ShieldCheck, color: C.amber, path: "/admin" }
];
const SUB_TABS = {
  user: [
    { key: "check_in", label: "Request Check-In", icon: CarFront },
    { key: "check_out", label: "Request Check-Out", icon: BellRing },
    { key: "add_on", label: "Add-On Services", icon: Wrench },
    { key: "tracker", label: "Vehicle Tracker", icon: Clock }
  ],
  valet: [
    { key: "visit_actions", label: "Visit Actions", icon: BadgeCheck },
    { key: "add_on_work", label: "Add-On Work", icon: Wrench }
  ],
  admin: [
    { key: "live_data", label: "Live Vehicle Data", icon: TrendingUp },
    { key: "tracker", label: "Vehicle Tracker", icon: Clock },
    { key: "pending_users", label: "Pending Signups", icon: UserRoundCheck }
  ]
};
const ACT = {
  create: "Check-In Requested", acknowledge: "Request Approved",
  ready: "Vehicle Ready", checkout: "Checked Out",
  request: "Checkout Requested", addon: "Add-On Requested",
  loadAddOns: "Add-Ons Loaded", startAddOn: "Add-On Started",
  completeAddOn: "Add-On Finished", load: "Visits Loaded",
};

function getVirtualStatus(v) {
  if (v.status === "CheckedOut") return "CheckedOut";

  // 1. In Progress Add-ons
  const activeAddOn = v.addOns?.find(a => a.status === "AddOnInProgress");
  if (activeAddOn) {
    if (activeAddOn.serviceName === "Washing" || activeAddOn.serviceName === "Cleaning") {
      return "AddOnInProgress"; // Wash Lane active
    } else {
      return "InProgress"; // Service Bay active
    }
  }

  // Pending Add-ons no longer move the vehicle to the service/wash lanes.
  // The vehicle will only move when the Valet explicitly starts the add-on (AddOnInProgress).

  // 3. Completed Add-ons (and still CheckedIn)
  const completedAddOn = v.addOns?.find(a => a.status === "AddOnCompleted");
  if (completedAddOn && v.status === "CheckedIn") {
    return "AddOnCompleted";
  }

  return v.status;
}

function buildSlots(allVisits) {
  // Bucket vehicles into zones by their status
  const buckets = {};
  ZONES.forEach(z => { buckets[z.key] = []; });

  allVisits.forEach(v => {
    const virtualStatus = getVirtualStatus(v);
    const zone = ZONES.find(z => z.statuses.includes(virtualStatus));
    const updatedVehicle = { ...v, status: virtualStatus };
    if (zone) buckets[zone.key].push(updatedVehicle);
    // Unrecognised statuses go to A as fallback
    else buckets["A"].push(updatedVehicle);
  });

  // Build all 50 slot objects
  return Array.from({ length: TOTAL }, (_, i) => {
    const n = i + 1;
    const zone = ZONES.find(z => n >= z.range[0] && n <= z.range[1]);
    const zKey = zone?.key ?? "A";
    // Position within the zone (0-based)
    const posInZone = n - zone.range[0];
    const vehicle = buckets[zKey][posInZone] ?? null;
    return {
      id: n,
      code: `${zKey}-${String(n).padStart(2, "0")}`,
      zone: zKey,
      vehicle,
      occupied: !!vehicle,
    };
  });
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication and role-based access control.
 * Validates the JWT token and redirects unauthorized users.
 * @param {Object} props
 * @param {ReactNode} props.children - The component to render if authorized.
 * @param {string} props.allowedRole - The role allowed to access the route.
 */
function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userRole = payload.role;

    if (allowedRole && allowedRole !== "any" && allowedRole !== userRole) {
      if (userRole === "Admin") return <Navigate to="/admin" replace />;
      if (userRole === "Valet") return <Navigate to="/valet" replace />;
      if (userRole === "Service Advisor") return <Navigate to="/advisor" replace />;
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * App Component
 * The main application router.
 * Defines the public login route and protected routes for different roles.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute allowedRole="Admin"><Dashboard tabName="admin" /></ProtectedRoute>} />
        <Route path="/valet" element={<ProtectedRoute allowedRole="Valet"><Dashboard tabName="valet" /></ProtectedRoute>} />
        <Route path="/advisor" element={<ProtectedRoute allowedRole="Service Advisor"><Dashboard tabName="user" /></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute allowedRole="Admin"><Dashboard tabName="timeline" /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Dashboard Component
 * Renders the main user interface based on the active role/tab (admin, valet, user, or timeline).
 * It manages the state for visits, add-ons, form inputs, and API responses.
 * @param {Object} props
 * @param {string} props.tabName - The current active tab/role for the dashboard.
 */
function Dashboard({ tabName }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(tabName);
  const availableSubTabs = SUB_TABS[tabName] || [];
  const [subTab, setSubTab] = useState(availableSubTabs[0]?.key);
  const [visitInput, setVisitInput] = useState("");
  const [tlInput, setTlInput] = useState("");
  const [tlVisit, setTlVisit] = useState(null);
  const [tlLoading, setTlLoading] = useState(false);
  const [form, setForm] = useState({ vehicleNumber: "", customerName: "", mobileNumber: "", email: "" });
  const [addon, setAddon] = useState(ADD_ONS[0]);
  const [apiResp, setApiResp] = useState(null);
  const [visits, setVisits] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [busy, setBusy] = useState("");
  const [lastCheckedInVisit, setLastCheckedInVisit] = useState(null);
  const toast = useToast();

  // Load visits automatically on mount
  useEffect(() => {
    go("load", "admin").catch(err => console.error("Error loading initial visits:", err));
  }, []);

  const nav = NAV.find(n => n.key === tab) ?? NAV[0];
  const role = tab;
  const active = visits.filter(v => v.status !== "CheckedOut");
  const slots = useMemo(() => buildSlots(visits), [visits]);
  const m = useMemo(() => ({
    active: visits.filter(v => v.status !== "CheckedOut").length,
    waiting: visits.filter(v => ["RequestedCheckIn", "Requested"].includes(v.status)).length,
    ready: visits.filter(v => v.status === "Ready").length,
    done: visits.filter(v => v.status === "CheckedOut").length,
    free: Math.max(0, TOTAL - visits.filter(v => v.status !== "CheckedOut").length),
  }), [visits]);

  function resolveVisitId(identifier) {
    if (!identifier) return null;
    const str = identifier.toString().trim();
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    const activeVisit = visits.find(v => v.vehicleNumber === str.toUpperCase() && v.status !== "CheckedOut");
    if (activeVisit) return activeVisit.id;
    const anyVisit = [...visits].reverse().find(v => v.vehicleNumber === str.toUpperCase());
    return anyVisit ? anyVisit.id : null;
  }

  const actualVisitId = useMemo(() => resolveVisitId(visitInput), [visitInput, visits]);

  // Load add-ons automatically when actualVisitId or tab changes
  useEffect(() => {
    if (actualVisitId && (tab === "valet" || tab === "user")) {
      parkingApi.getAddOns(role, actualVisitId)
        .then(res => setAddOns(res.body?.data ?? []))
        .catch(() => setAddOns([]));
    } else {
      setAddOns([]);
    }
  }, [actualVisitId, tab, role]);

  async function run(action, r = role) {
    setBusy(`${r}:${action}`);
    try {
      const res = await go(action, r);
      setApiResp({ ok: true, label: ACT[action], body: res });

      let title = ACT[action];
      let desc = undefined;

      if (action === "create") {
        const generatedId = res.body?.id;
        if (generatedId) {
          setLastCheckedInVisit({
            id: generatedId,
            vehicleNumber: form.vehicleNumber,
            customerName: form.customerName
          });
          title = "Check-In Created";
          desc = `Assigned Visit ID: ${generatedId}`;
          // Clear the form
          setForm({ vehicleNumber: "", customerName: "", mobileNumber: "", email: "" });
        }
      }

      toast({
        title,
        description: desc,
        status: "success",
        duration: action === "create" ? 6000 : 2000,
        isClosable: true,
        position: "bottom-right"
      });

      // Auto reload lot map after each change (except loading actions)
      if (action !== "load" && action !== "loadAddOns") {
        await go("load", "admin");
        if (actualVisitId && (tab === "valet" || tab === "user")) {
          try {
            const res = await parkingApi.getAddOns(role, actualVisitId);
            setAddOns(res.body?.data ?? []);
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      if (e.message.includes("401") || e.message.includes("missing or invalid")) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      setApiResp({ ok: false, label: "Failed", body: { error: e.message } });
      toast({ title: "Failed", description: e.message, status: "error", duration: 3000, isClosable: true, position: "bottom-right" });
    } finally { setBusy(""); }
  }

  async function go(action, r) {
    if (!["load", "create", "loadPendingUsers"].includes(action) && !actualVisitId) throw new Error("Invalid Visit ID or Vehicle Number");
    switch (action) {
      case "create":
        if (!form.vehicleNumber.trim()) throw new Error("Vehicle number required");
        if (!/^[A-Z0-9]{4,10}$/.test(form.vehicleNumber)) throw new Error("Invalid vehicle number format (e.g. TN01AB1234)");
        if (!form.customerName.trim()) throw new Error("Customer name required");
        return parkingApi.createVisit(r, { ...form, status: "RequestedCheckIn" });
      case "acknowledge": return parkingApi.acknowledge(r, actualVisitId);
      case "ready": return parkingApi.markReady(r, actualVisitId);
      case "request": return parkingApi.requestCheckout(r, actualVisitId);
      case "checkout": return parkingApi.checkOut(r, actualVisitId);
      case "addon": return parkingApi.addOn(r, actualVisitId, addon);
      case "loadAddOns": {
        const res = await parkingApi.getAddOns(r, actualVisitId);
        setAddOns(res.body?.data ?? []);
        return res;
      }
      case "startAddOn": return parkingApi.startAddOn(r, actualVisitId, addon);
      case "completeAddOn": return parkingApi.completeAddOn(r, actualVisitId, addon);
      case "load": {
        const res = await parkingApi.loadVisits();
        setVisits(res.body?.data ?? []);
        return res;
      }
      case "loadPendingUsers": {
        const res = await parkingApi.getPendingUsers();
        setPendingUsers(res.body ?? []);
        return res;
      }
      default: throw new Error("Unknown action");
    }
  }

  async function trackTimeline() {
    const actualTlId = resolveVisitId(tlInput);
    if (!actualTlId) { toast({ title: "Enter a valid Visit ID or Vehicle Number", status: "warning", duration: 2000, position: "bottom-right" }); return; }
    setTlLoading(true);
    try {
      const r = await parkingApi.getVisit("admin", actualTlId);
      setTlVisit(r.body?.data ?? r.body ?? null);
    } catch (e) {
      toast({ title: "Not found", description: e.message, status: "error", duration: 3000, position: "bottom-right" });
      setTlVisit(null);
    } finally { setTlLoading(false); }
  }

  const occupancy = Math.round(m.active / TOTAL * 100);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <Flex minH="100vh" bg={C.bg} fontFamily="'Inter', system-ui, sans-serif" color={C.text}>

      {/* ── Sidebar ── */}
      <Box as="nav" w="232px" flexShrink={0} bg={C.sidebar}
        display={{ base: "none", lg: "flex" }} flexDirection="column"
        position="sticky" top={0} h="100vh">

        {/* Brand */}
        <Flex align="center" justify="space-between" px={5} py={5} borderBottom={`1px solid ${C.sidebarLine}`}>
          <Flex align="center" gap={3}>
            <Flex w="32px" h="32px" borderRadius="9px"
              bg="linear-gradient(135deg,#2563eb,#6366f1)"
              align="center" justify="center" flexShrink={0}>
              <Icon as={ParkingCircle} boxSize={3.5} color="white" />
            </Flex>
            <Box>
              <Text fontSize="14px" fontWeight="700" color="white" lineHeight={1}>ParkOps</Text>
              <Text fontSize="10px" color={C.sidebarMuted} letterSpacing="0.07em" mt={0.5}>LOT CONTROL</Text>
            </Box>
          </Flex>

          <Icon as={LogOut} boxSize={4} color={C.sidebarMuted} cursor="pointer" onClick={handleLogout} _hover={{ color: "white" }} />
        </Flex>

        {/* Nav */}
        <Box flex={1} px={3} pt={5}>
          <Text fontSize="9px" fontWeight="700" color={C.sidebarMuted}
            letterSpacing="0.16em" px={3} mb={2}>WORKSPACE ACTIONS</Text>
          <VStack spacing={0.5}>
            {availableSubTabs.map(item => {
              const on = subTab === item.key;
              return (
                <Flex key={item.key} as="button" w="full" align="center" gap={2.5}
                  px={3} py={2.5} borderRadius="8px"
                  bg={on ? C.sidebarSub : "transparent"}
                  onClick={() => setSubTab(item.key)}
                  transition="background 0.12s" _hover={{ bg: C.sidebarSub }}
                  position="relative">
                  {on && <Box position="absolute" left={0} top="50%" transform="translateY(-50%)"
                    w="2.5px" h="16px" bg={nav.color} borderRadius="0 3px 3px 0" />}
                  <Flex w="26px" h="26px" borderRadius="7px"
                    bg={on ? nav.color + "28" : "#ffffff0e"}
                    align="center" justify="center" flexShrink={0}>
                    <Icon as={item.icon} boxSize={3.5} color={on ? nav.color : C.sidebarMuted} />
                  </Flex>
                  <Text fontSize="13px" fontWeight={on ? "600" : "400"}
                    color={on ? "white" : C.sidebarText}>{item.label}</Text>
                </Flex>
              );
            })}
          </VStack>
        </Box>

        {/* Occupancy widget */}
        <Box px={4} py={5} borderTop={`1px solid ${C.sidebarLine}`}>
          <Box bg="#ffffff08" border={`1px solid ${C.sidebarLine}`} borderRadius="10px" p={3} mb={3}>
            <Text fontSize="9px" fontWeight="700" color={C.sidebarMuted} letterSpacing="0.14em">OCCUPANCY</Text>
            <Flex align="baseline" gap={1.5} mt={1.5}>
              <Text fontSize="22px" fontWeight="800" color="white" lineHeight={1}>{m.active}</Text>
              <Text fontSize="12px" color={C.sidebarMuted}>/ {TOTAL} slots</Text>
            </Flex>
            <Box h="5px" bg="#ffffff10" borderRadius="999px" mt={2.5} overflow="hidden">
              <Box h="full" bg={C.teal} w={`${occupancy}%`} transition="width 0.4s" borderRadius="999px" />
            </Box>
          </Box>
          <HStack spacing={2}>
            <Box w="6px" h="6px" borderRadius="full" bg={C.green} />
            <Text fontSize="11px" color={C.sidebarMuted}>System online</Text>
          </HStack>
        </Box>
      </Box>

      {/* ── Main ── */}
      <Box flex={1} minW={0} overflowY="auto">

        {/* Topbar */}
        <Flex px={{ base: 5, md: 8 }} py={3.5} bg={C.surface}
          borderBottom={`1px solid ${C.border}`}
          align="center" justify="space-between"
          position="sticky" top={0} zIndex={10}
          boxShadow="0 1px 0 #e4e7f0">
          <Box>
            <HStack spacing={2} mb={0.5}>
              <Box w="6px" h="6px" borderRadius="full" bg={nav.color} />
              <Text fontSize="10px" fontWeight="700" color={C.muted} letterSpacing="0.1em">
                {nav.label.toUpperCase()}
              </Text>
            </HStack>
            <Text fontSize={{ base: "17px", md: "20px" }} fontWeight="700" color={C.text} lineHeight={1.2}>
              {tab === "user" ? "Service Advisor Desk"
                : tab === "valet" ? "Valet Lane Control"
                  : tab === "admin" ? "Parking Lot Dashboard"
                    : "Vehicle Tracker"}
            </Text>
          </Box>
          {/* Mobile nav */}
          <HStack spacing={1} display={{ base: "flex", lg: "none" }}>
            {availableSubTabs.map(item => (
              <Flex key={item.key} as="button" w="32px" h="32px" borderRadius="8px"
                align="center" justify="center"
                bg={subTab === item.key ? nav.color + "15" : C.faint}
                border={`1px solid ${subTab === item.key ? nav.color + "50" : C.border}`}
                onClick={() => setSubTab(item.key)}>
                <Icon as={item.icon} boxSize={3.5} color={subTab === item.key ? nav.color : C.muted} />
              </Flex>
            ))}
          </HStack>
        </Flex>

        <Box px={{ base: 5, md: 8 }} py={5}>
          <Stack spacing={4}>

            {/* ── Metric cards (moved to top for compactness) ── */}
            <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={3}>
              {[
                { icon: Car, label: "Active", value: m.active, color: C.blue, soft: C.blueSoft },
                { icon: Timer, label: "Waiting", value: m.waiting, color: C.amber, soft: C.amberSoft },
                { icon: Zap, label: "Ready", value: m.ready, color: C.green, soft: C.greenSoft },
                { icon: TrendingUp, label: "Completed", value: m.done, color: C.indigo, soft: C.indigoSoft },
                { icon: ParkingCircle, label: "Free Slots", value: m.free, color: C.teal, soft: C.tealSoft, suffix: `/${TOTAL}` },
              ].map(c => (
                <Box key={c.label} bg={C.surface} border={`1px solid ${C.border}`}
                  borderTop={`3px solid ${c.color}`} borderRadius="12px" p={3}
                  _hover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", transform: "translateY(-1px)" }}
                  transition="all 0.15s">
                  <Flex align="center" gap={2}>
                    <Flex w="24px" h="24px" borderRadius="6px" bg={c.soft}
                      align="center" justify="center" flexShrink={0}>
                      <Icon as={c.icon} boxSize={3} color={c.color} />
                    </Flex>
                    <Text fontSize="10px" fontWeight="600" color={C.muted}>{c.label}</Text>
                  </Flex>
                  <Text fontSize="20px" fontWeight="800" color={C.text} lineHeight={1} mt={2}>
                    {c.value}
                    {c.suffix && <Text as="span" fontSize="10px" color={C.muted} fontWeight="500" ml={0.5}>{c.suffix}</Text>}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            {/* ── Unified Split Dashboard Layout ── */}
            <Grid templateColumns={{ base: "1fr", xl: "1.15fr 0.85fr" }} gap={5} alignItems="start">

              {/* Left Pane: Controls, Active Lot & API Logs */}
              <GridItem>
                <Stack spacing={4}>

                  {/* Tabbed Action Panels */}
                  <Card>
                    {/* Tab header */}
                    <Flex align="center" gap={3} pb={4} mb={4} borderBottom={`1px solid ${C.border}`}>
                      <Flex w="36px" h="36px" borderRadius="9px"
                        bg={tab === "user" ? C.blueSoft : tab === "valet" ? C.tealSoft : tab === "admin" ? C.amberSoft : C.indigoSoft}
                        align="center" justify="center" flexShrink={0}>
                        <Icon as={nav.icon} boxSize={4} color={nav.color} />
                      </Flex>
                      <Box>
                        <Text fontSize="14px" fontWeight="700" color={C.text}>{nav.label}</Text>
                        <Text fontSize="11px" color={C.muted}>
                          {tab === "user" ? "Check vehicles in and out"
                            : tab === "valet" ? "Manage vehicle handoffs"
                              : tab === "admin" ? "Monitor all lot activity"
                                : "Track any vehicle's journey"}
                        </Text>
                      </Box>
                    </Flex>

                    {/* ── USER TAB SECTIONS ── */}
                    {/* Contains check-in, check-out, and add-on services tailored for Service Advisors */}
                    {tab === "user" && (
                      <Stack spacing={5}>
                        {subTab === "check_in" && (
                          <Section label="Request Check-In">
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={2}>
                              <Field label="Vehicle No." value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value.replace(/\s+/g, '').toUpperCase() })} placeholder="TN01AB1234" required />
                              <Field label="Customer Name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="John Doe" required />
                              <Field label="Mobile" value={form.mobileNumber} onChange={e => setForm({ ...form, mobileNumber: e.target.value })} placeholder="9876543210" />
                              <Field label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="abc@example.com" />
                            </SimpleGrid>
                            <AppBtn mt={3} color={C.blue} soft={C.blueSoft} icon={CarFront} loading={busy === "user:create"} onClick={() => run("create", "user")}>
                              Request Check-In
                            </AppBtn>

                            {lastCheckedInVisit && (
                              <Box bg={C.greenSoft} border={`1px solid ${C.green}30`} borderRadius="10px" p={3.5} mt={4.5}>
                                <Flex align="center" gap={3}>
                                  <Icon as={CheckCircle2} boxSize={5} color={C.green} />
                                  <Box>
                                    <Text fontSize="13px" fontWeight="700" color={C.text}>
                                      Vehicle Registered Successfully
                                    </Text>
                                    <Text fontSize="12px" color={C.sub} mt={0.5}>
                                      Vehicle <strong>{lastCheckedInVisit.vehicleNumber}</strong> has been assigned Visit ID: <strong style={{ color: C.green }}>{lastCheckedInVisit.id}</strong>.
                                    </Text>
                                  </Box>
                                  <Button size="xs" ml="auto" colorScheme="green" variant="ghost" onClick={() => setLastCheckedInVisit(null)}>
                                    Dismiss
                                  </Button>
                                </Flex>
                              </Box>
                            )}
                          </Section>
                        )}

                        {subTab === "check_out" && (
                          <Section label="Request Check-Out">
                            <Box maxW="240px" mt={2}>
                              <Field label="Visit ID or Vehicle No." value={visitInput} onChange={e => setVisitInput(e.target.value.toUpperCase())} placeholder="101 or TN01AB1234" />
                            </Box>
                            <AppBtn mt={3} color={C.blue} soft={C.blueSoft} icon={BellRing} outline loading={busy === "user:request"} onClick={() => run("request", "user")}>
                              Request Check-Out
                            </AppBtn>
                          </Section>
                        )}

                        {subTab === "add_on" && (
                          <Section label="Add-On Services">
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={2} maxW="480px">
                              <Field label="Visit ID or Vehicle No." value={visitInput} onChange={e => setVisitInput(e.target.value.toUpperCase())} placeholder="101 or TN01AB1234" />
                              <FormControl>
                                <FormLabel fontSize="11px" fontWeight="600" color={C.muted} letterSpacing="0.06em" mb={1.5}>Service</FormLabel>
                                <Select value={addon} onChange={e => setAddon(e.target.value)}
                                  bg={C.surface} border={`1px solid ${C.border}`} borderRadius="9px"
                                  color={C.text} fontSize="13px"
                                  _focus={{ borderColor: C.borderFocus, boxShadow: "none" }}>
                                  {ADD_ONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </Select>
                              </FormControl>
                            </SimpleGrid>
                            <AppBtn mt={3} color={C.indigo} soft={C.indigoSoft} icon={Wrench} outline loading={busy === "user:addon"} onClick={() => run("addon", "user")}>
                              Request Add-On
                            </AppBtn>
                          </Section>
                        )}
                      </Stack>
                    )}

                    {/* ── VALET TAB SECTIONS ── */}
                    {/* Contains visit actions and add-on work execution tailored for Valets */}
                    {tab === "valet" && (
                      <Stack spacing={5}>
                        {subTab === "visit_actions" && (
                          <Section label="Visit Actions">
                            <Box maxW="240px" mt={2} mb={3}>
                              <Field label="Visit ID or Vehicle No." value={visitInput} onChange={e => setVisitInput(e.target.value.toUpperCase())} placeholder="101 or TN01AB1234" />
                            </Box>
                            <Stack spacing={2}>
                              <ActionRow color={C.teal} soft={C.tealSoft} icon={BadgeCheck} title="Approve Request" sub="Approve check-in and update status" loading={busy === "valet:acknowledge"} onClick={() => run("acknowledge", "valet")} />
                              <ActionRow color={C.green} soft={C.greenSoft} icon={CheckCircle2} title="Mark Ready" sub="Vehicle serviced, awaiting pickup" loading={busy === "valet:ready"} onClick={() => run("ready", "valet")} />
                              <ActionRow color={C.indigo} soft={C.indigoSoft} icon={CarFront} title="Accept Checkout" sub="Confirm handoff to customer" loading={busy === "valet:checkout"} onClick={() => run("checkout", "valet")} />
                            </Stack>
                          </Section>
                        )}

                        {subTab === "add_on_work" && (
                          <Section label="Add-On Work">
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={2} mb={3} maxW="480px">
                              <Field label="Visit ID or Vehicle No." value={visitInput} onChange={e => setVisitInput(e.target.value.toUpperCase())} placeholder="101 or TN01AB1234" />
                              <FormControl>
                                <FormLabel fontSize="11px" fontWeight="600" color={C.muted} letterSpacing="0.06em" mb={1.5}>Service</FormLabel>
                                <Select value={addon} onChange={e => setAddon(e.target.value)}
                                  bg={C.surface} border={`1px solid ${C.border}`} borderRadius="9px"
                                  color={C.text} fontSize="13px"
                                  _focus={{ borderColor: C.borderFocus, boxShadow: "none" }}>
                                  {ADD_ONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </Select>
                              </FormControl>
                            </SimpleGrid>
                            <Stack spacing={2}>
                              <ActionRow color={C.amber} soft={C.amberSoft} icon={Wrench} title="Start Add-On" sub="Begin the selected extra service" loading={busy === "valet:startAddOn"} onClick={() => run("startAddOn", "valet")} />
                              <ActionRow color={C.green} soft={C.greenSoft} icon={CheckCircle2} title="Stop Add-On" sub="Finish and complete the extra service" loading={busy === "valet:completeAddOn"} onClick={() => run("completeAddOn", "valet")} />
                            </Stack>
                            {addOns.length > 0 && (
                              <Stack spacing={2} mt={3}>
                                {addOns.map(a => (
                                  <Flex key={a.id} align="center" justify="space-between" gap={3}
                                    px={3} py={2} border={`1px solid ${C.border}`} borderRadius="9px" bg={C.faint}>
                                    <Box>
                                      <Text fontSize="12px" fontWeight="600" color={C.text}>{a.serviceName}</Text>
                                      <Text fontSize="10px" color={C.muted}>Visit #{a.visitId} · {a.createdAt ?? "n/a"}</Text>
                                    </Box>
                                    <StatusPill status={a.status} />
                                  </Flex>
                                ))}
                              </Stack>
                            )}
                          </Section>
                        )}
                      </Stack>
                    )}

                    {/* ── ADMIN TAB SECTIONS ── */}
                    {/* Contains live vehicle data monitoring tailored for Admins */}
                    {tab === "admin" && (
                      <Stack spacing={4}>
                        {subTab === "live_data" && (
                          <>
                            <Flex justify="space-between" align="center">
                              <SLabel>Live Vehicle Data</SLabel>
                              <AppBtn color={C.amber} soft={C.amberSoft} icon={RefreshCw} size="sm"
                                loading={busy === "admin:load"} onClick={() => run("load", "admin")}>
                                Refresh
                              </AppBtn>
                            </Flex>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <VehicleTable title="In Lot" icon={Car} iconColor={C.blue} visits={active} />
                              <VehicleTable title="All History" icon={TrendingUp} iconColor={C.indigo} visits={visits} />
                            </SimpleGrid>
                          </>
                        )}
                        {subTab === "pending_users" && (
                          <Section label="Pending Signups">
                            <Flex justify="space-between" align="center" mt={2} mb={4}>
                              <Text fontSize="13px" color={C.sub}>Users waiting for role assignment</Text>
                              <AppBtn color={C.blue} soft={C.blueSoft} icon={RefreshCw} size="sm" loading={busy === "admin:loadPendingUsers"} onClick={() => run("loadPendingUsers", "admin")}>Refresh</AppBtn>
                            </Flex>

                            {pendingUsers.length === 0 ? (
                              <Flex direction="column" align="center" gap={2} py={8} borderRadius="10px" bg={C.faint} border={`1.5px dashed ${C.border}`}>
                                <Icon as={UserRoundCheck} boxSize={6} color={C.muted} />
                                <Text fontSize="12px" color={C.muted}>No pending signups found.</Text>
                              </Flex>
                            ) : (
                              <Stack spacing={3}>
                                {pendingUsers.map(user => (
                                  <Flex key={user.id} align="center" justify="space-between" p={3} bg={C.faint} border={`1px solid ${C.border}`} borderRadius="10px">
                                    <Box>
                                      <Text fontSize="13px" fontWeight="700" color={C.text}>{user.username}</Text>
                                      <Text fontSize="11px" color={C.muted}>Email: {user.email} | ID: {user.id}</Text>
                                    </Box>
                                    <Flex align="center" gap={3}>
                                      <Select
                                        id={`role-${user.id}`}
                                        defaultValue="Service Advisor"
                                        size="sm" bg={C.surface}
                                        w="150px" borderRadius="8px"
                                      >
                                        <option value="Service Advisor">Service Advisor</option>
                                        <option value="Valet">Valet</option>
                                        <option value="Admin">Admin</option>
                                      </Select>
                                      <Button
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={async () => {
                                          const role = document.getElementById(`role-${user.id}`).value;
                                          setBusy("admin:assignRole");
                                          try {
                                            await parkingApi.assignRole(user.id, role);
                                            toast({ title: "Role Assigned", status: "success", duration: 2000, position: "bottom-right" });
                                            run("loadPendingUsers", "admin");
                                          } catch (e) {
                                            toast({ title: "Failed", description: e.message, status: "error", duration: 3000, position: "bottom-right" });
                                          } finally {
                                            setBusy("");
                                          }
                                        }}
                                      >
                                        Approve
                                      </Button>
                                    </Flex>
                                  </Flex>
                                ))}
                              </Stack>
                            )}
                          </Section>
                        )}
                      </Stack>
                    )}

                    {/* ── VEHICLE TRACKER SECTION ── */}
                    {/* Contains the timeline and history lookup for a specific Visit ID */}
                    {subTab === "tracker" && (
                      <Stack spacing={4}>
                        <Section label="Look Up Visit">
                          <HStack mt={2} spacing={3} align="flex-end" maxW="380px">
                            <Box flex={1}>
                              <Field label="Visit ID or Vehicle No." value={tlInput} onChange={e => setTlInput(e.target.value.toUpperCase())} placeholder="101 or TN01AB1234" />
                            </Box>
                            <AppBtn color={C.indigo} soft={C.indigoSoft} icon={CircleDot} loading={tlLoading} onClick={trackTimeline}>
                              Track
                            </AppBtn>
                          </HStack>
                        </Section>

                        {!tlVisit && !tlLoading && (
                          <Flex direction="column" align="center" gap={2} py={8}
                            borderRadius="10px" bg={C.faint} border={`1.5px dashed ${C.border}`}>
                            <Icon as={Clock} boxSize={6} color={C.muted} />
                            <Text fontSize="12px" color={C.muted}>Enter a Visit ID or Vehicle No. to see its journey</Text>
                          </Flex>
                        )}

                        {tlVisit && (
                          <Stack spacing={4}>
                            {/* Vehicle header */}
                            <Flex align="center" gap={3} px={4} py={3}
                              bg={C.faint} borderRadius="10px" border={`1px solid ${C.border}`}>
                              <Flex w="42px" h="42px" borderRadius="10px" bg={C.blueSoft}
                                align="center" justify="center" flexShrink={0}>
                                <Icon as={CarFront} boxSize={5} color={C.blue} />
                              </Flex>
                              <Box flex={1} minW={0}>
                                <Text fontWeight="800" fontSize="15px" color={C.text}>{tlVisit.vehicleNumber ?? "—"}</Text>
                                <Text fontSize="12px" color={C.muted}>{tlVisit.customerName} · Visit #{tlVisit.id}</Text>
                              </Box>
                              <StatusPill status={tlVisit.status} />
                            </Flex>

                            {/* Step flow */}
                            <Box overflowX="auto" py={1}>
                              <HStack spacing={0} minW="540px">
                                {STEPS.map((step, i) => {
                                  const order = STEPS.map(s => s.key);
                                  const cur = order.indexOf(tlVisit.status);
                                  const done = i <= cur;
                                  const now = step.key === tlVisit.status;
                                  const cfg = STATUS[step.key] ?? STATUS["CheckedOut"];
                                  return (
                                    <Box key={step.key} flex={1} display="flex" flexDirection="column"
                                      alignItems="center" position="relative">
                                      {i < STEPS.length - 1 && (
                                        <Box position="absolute" left="50%" top="18px" w="100%" h="2px"
                                          bg={done && i < cur ? cfg.color : C.border} zIndex={0} />
                                      )}
                                      <Flex w="36px" h="36px" borderRadius="full"
                                        bg={done ? cfg.soft : C.faint}
                                        border={`2px solid ${done ? cfg.color : C.border}`}
                                        align="center" justify="center"
                                        position="relative" zIndex={1}
                                        boxShadow={now ? `0 0 0 4px ${cfg.color}22` : "none"}
                                        transition="all 0.2s">
                                        <Icon as={step.icon} boxSize={3.5} color={done ? cfg.color : C.muted} />
                                      </Flex>
                                      <Text fontSize="10px" fontWeight={now ? "700" : "500"}
                                        color={done ? C.text : C.muted} mt={1.5} textAlign="center" px={0.5}>
                                        {step.label}
                                      </Text>
                                      {now && (
                                        <Box mt={1} px={1.5} py={0.5} borderRadius="4px"
                                          bg={cfg.color} fontSize="8px" fontWeight="700"
                                          color="white" letterSpacing="0.06em">NOW</Box>
                                      )}
                                    </Box>
                                  );
                                })}
                              </HStack>
                            </Box>

                            {/* Detail chips */}
                            <SimpleGrid columns={3} spacing={3}>
                              {[
                                { k: "Customer", v: tlVisit.customerName ?? "—" },
                                { k: "Mobile", v: tlVisit.mobileNumber ?? "—" },
                                { k: "Checked In", v: tlVisit.createdAt ?? "—" },
                              ].map(d => (
                                <Box key={d.k} bg={C.faint} border={`1px solid ${C.border}`}
                                  borderRadius="9px" p={3}>
                                  <Text fontSize="9px" fontWeight="700" color={C.muted}
                                    letterSpacing="0.1em">{d.k.toUpperCase()}</Text>
                                  <Text fontSize="13px" fontWeight="600" mt={1} color={C.text}>{d.v}</Text>
                                </Box>
                              ))}
                            </SimpleGrid>
                          </Stack>
                        )}
                      </Stack>
                    )}
                  </Card>

                  {/* Active Lot (Show here when on valet tab) */}
                  {tab === "valet" && (
                    <Card>
                      <Flex justify="space-between" align="center" mb={4}>
                        <Box>
                          <SLabel>Active Lot</SLabel>
                          <Text fontSize="12px" color={C.muted} mt={0.5}>Vehicles currently inside</Text>
                        </Box>
                        <Box px={2.5} py={0.5} borderRadius="999px"
                          bg={C.blueSoft} color={C.blue} fontSize="11px" fontWeight="700"
                          border={`1px solid ${C.blue}28`}>
                          {active.length}
                        </Box>
                      </Flex>
                      <Box maxH="280px" overflowY="auto" pr={1}
                        sx={{
                          "&::-webkit-scrollbar": { width: "4px" },
                          "&::-webkit-scrollbar-track": { background: "transparent" },
                          "&::-webkit-scrollbar-thumb": { background: C.border, borderRadius: "4px" }
                        }}>
                        <VStack spacing={2} align="stretch">
                          {active.length === 0 ? (
                            <Flex direction="column" align="center" gap={2} py={8}
                              borderRadius="10px" bg={C.faint} border={`1.5px dashed ${C.border}`}>
                              <Icon as={ParkingCircle} boxSize={6} color={C.muted} />
                              <Text fontSize="12px" color={C.muted}>No active vehicles in lot</Text>
                            </Flex>
                          ) : active.map(v => {
                            const vZone = ZONES.find(z => z.statuses.includes(v.status)) ?? ZONES[0];
                            return (
                              <Flex key={v.id} align="center" gap={3} px={3} py={2}
                                border={`1px solid ${C.border}`} borderRadius="10px"
                                _hover={{ bg: C.faint, transform: "translateX(2px)" }}
                                transition="all 0.15s">
                                <Flex w="30px" h="30px" borderRadius="7px"
                                  bg={vZone.color + "18"}
                                  align="center" justify="center" flexShrink={0}>
                                  <Icon as={CarFront} boxSize={3.5} color={vZone.color} />
                                </Flex>
                                <Box flex={1} minW={0}>
                                  <Text fontSize="13px" fontWeight="700" color={C.text}>{v.vehicleNumber}</Text>
                                  <Text fontSize="11px" color={C.muted} isTruncated>
                                    {v.customerName} · <Text as="span" color={vZone.color} fontWeight="600">{vZone.key}</Text>
                                  </Text>
                                </Box>
                                <StatusPill status={v.status} />
                              </Flex>
                            );
                          })}
                        </VStack>
                      </Box>
                    </Card>
                  )}

                  {/* API response logs removed for a cleaner, user-focused UI */}
                </Stack>
              </GridItem>

              {/* Right Pane: Live Lot Map & Status Legend (Always Visible) */}
              <GridItem position={{ xl: "sticky" }} top="76px">
                <Card>
                  <Flex justify="space-between" align="center" mb={4} direction={{ base: "column", sm: "row" }} gap={3}>
                    <Box>
                      <SLabel>Live Lot Map</SLabel>
                      <Text fontSize="11px" color={C.muted} mt={0.5}>
                        Slots update instantly on workspace actions
                      </Text>
                    </Box>
                    <HStack spacing={2.5} flexWrap="wrap" justify="flex-end">
                      {ZONES.map(z => (
                        <HStack key={z.key} spacing={1}>
                          <Box w="6.5px" h="6.5px" borderRadius="full" bg={z.color} />
                          <Text fontSize="9.5px" fontWeight="600" color={C.muted}>{z.key}</Text>
                        </HStack>
                      ))}
                    </HStack>
                  </Flex>

                  <Stack spacing={4}>
                    {ZONES.map(zone => {
                      const zs = slots.filter(s => s.zone === zone.key);
                      const occupiedCount = zs.filter(s => s.occupied).length;
                      return (
                        <Box key={zone.key}>
                          <Flex justify="space-between" align="center" mb={1.5}>
                            <HStack spacing={2}>
                              <Box w="6px" h="6px" borderRadius="full" bg={zone.color} />
                              <Text fontSize="11px" fontWeight="600" color={C.sub}>
                                Zone {zone.key} · <Text as="span" fontSize="10px" fontWeight="500" color={C.muted}>{zone.label}</Text>
                              </Text>
                            </HStack>
                            <Text fontSize="10.5px" color={occupiedCount > 0 ? zone.color : C.muted} fontWeight={occupiedCount > 0 ? "700" : "500"}>
                              {occupiedCount}/{zs.length}
                            </Text>
                          </Flex>

                          {/* 5 columns is optimal for standard sidebar width */}
                          <SimpleGrid columns={{ base: 5, sm: 5, md: 10, xl: 5, "2xl": 10 }} spacing={1.5}>
                            {zs.map(slot => {
                              const occupied = slot.occupied;
                              return (
                                <Box key={slot.code} h="44px" position="relative"
                                  bg={occupied ? zone.color + "0a" : "transparent"}
                                  borderLeft={`2px solid ${occupied ? zone.color : C.border}`}
                                  borderRight={`2px solid ${occupied ? zone.color : C.border}`}
                                  borderTop="1px dashed transparent"
                                  borderBottom="1px dashed transparent"
                                  p={1.5} display="flex" flexDirection="column" justifyContent="space-between"
                                  transition="all 0.18s"
                                  _hover={{ bg: occupied ? zone.color + "14" : "#f1f3f7", transform: "translateY(-1px)", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}
                                  cursor="pointer"
                                  title={slot.vehicle ? `${slot.code}: ${slot.vehicle.vehicleNumber} (${slot.vehicle.status})` : `${slot.code}: free`}>

                                  {/* Smart LED status light */}
                                  <Box position="absolute" top="5px" right="5px" w="4.5px" h="4.5px" borderRadius="full"
                                    bg={occupied ? zone.color : "#cbd5e1"}
                                    boxShadow={occupied ? `0 0 5px ${zone.color}` : "none"} />

                                  <Text fontSize="8px" fontWeight="800" fontFamily="mono" color={occupied ? zone.color : C.muted} lineHeight={1}>
                                    {slot.code}
                                  </Text>
                                  <Text fontSize="9px" fontWeight="700" fontFamily="mono" color={occupied ? C.text : C.muted} isTruncated>
                                    {slot.vehicle?.vehicleNumber ?? "—"}
                                  </Text>
                                </Box>
                              );
                            })}
                          </SimpleGrid>
                        </Box>
                      );
                    })}
                  </Stack>

                  {/* Integrated Status Legend */}
                  <Box pt={3} mt={4} borderTop={`1px solid ${C.border}`}>
                    <Text fontSize="9px" fontWeight="700" color={C.muted}
                      letterSpacing="0.12em" mb={2}>STATUS LEGEND</Text>
                    <SimpleGrid columns={{ base: 2, sm: 3, xl: 2, "2xl": 5 }} spacing={1.5}>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <HStack key={k} spacing={1.5}>
                          <Box w="5.5px" h="5.5px" borderRadius="full" bg={v.color} flexShrink={0} />
                          <Text fontSize="9.5px" color={C.sub} fontWeight="500" whiteSpace="nowrap">{v.label}</Text>
                        </HStack>
                      ))}
                    </SimpleGrid>
                  </Box>
                </Card>
              </GridItem>
            </Grid>

          </Stack>
        </Box>
      </Box>
    </Flex>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Card({ children }) {
  return (
    <Box bg={C.surface} border={`1px solid ${C.border}`} borderRadius="14px"
      p={{ base: 5, md: 6 }} boxShadow="0 1px 3px rgba(0,0,0,0.04)">
      {children}
    </Box>
  );
}

function SLabel({ children }) {
  return (
    <Text fontSize="11px" fontWeight="700" color={C.muted} letterSpacing="0.1em">
      {children.toUpperCase()}
    </Text>
  );
}

function Section({ label, children }) {
  return (
    <Box>
      <SLabel>{label}</SLabel>
      {children}
    </Box>
  );
}

function Field({ label, required, ...props }) {
  return (
    <FormControl isRequired={required}>
      <FormLabel fontSize="11px" fontWeight="600" color={C.muted}
        letterSpacing="0.06em" mb={1.5}>{label}</FormLabel>
      <Input {...props} size="md" bg={C.surface} border={`1px solid ${C.border}`}
        borderRadius="9px" color={C.text} fontSize="13px"
        _placeholder={{ color: "#bec4d4" }}
        _focus={{ borderColor: C.borderFocus, boxShadow: "none" }}
        _hover={{ borderColor: C.borderFocus }} />
    </FormControl>
  );
}

function AppBtn({ color, soft, icon, children, outline, loading, size = "md", onClick, mt }) {
  return (
    <Button mt={mt} size={size} onClick={onClick} isLoading={loading}
      leftIcon={<Icon as={icon} boxSize={size === "sm" ? 3.5 : 4} />}
      fontSize={size === "sm" ? "11px" : "13px"} fontWeight="600"
      borderRadius="9px" px={size === "sm" ? 3 : 4}
      bg={outline ? "transparent" : color}
      color={outline ? color : "white"}
      border={`1.5px solid ${color}`}
      _hover={{ opacity: 0.87, transform: "translateY(-1px)", boxShadow: `0 4px 14px ${color}28` }}
      _active={{ transform: "scale(0.97)" }}
      transition="all 0.14s">
      {children}
    </Button>
  );
}

function ActionRow({ color, soft, icon, title, sub, loading, onClick }) {
  return (
    <Flex as="button" onClick={onClick} disabled={loading}
      align="center" gap={3} px={4} py={3}
      bg={C.surface} borderRadius="10px" border={`1px solid ${C.border}`}
      _hover={{ borderColor: color, bg: soft, boxShadow: `0 2px 10px ${color}14` }}
      transition="all 0.14s" w="full"
      opacity={loading ? 0.5 : 1} cursor={loading ? "not-allowed" : "pointer"}>
      <Flex w="32px" h="32px" borderRadius="8px" bg={soft}
        align="center" justify="center" flexShrink={0}>
        <Icon as={icon} boxSize={4} color={color} />
      </Flex>
      <Box flex={1} textAlign="left">
        <Text fontSize="13px" fontWeight="600" color={C.text}>{title}</Text>
        <Text fontSize="11px" color={C.muted}>{sub}</Text>
      </Box>
      <Icon as={ArrowRight} boxSize={3.5} color={C.muted} />
    </Flex>
  );
}

function StatusPill({ status }) {
  const s = STATUS[status] ?? { label: status, color: C.gray, soft: C.graySoft };
  return (
    <Box px={2.5} py={0.5} borderRadius="20px" bg={s.soft}
      border={`1px solid ${s.color}28`} fontSize="11px" fontWeight="600"
      color={s.color} letterSpacing="0.02em" whiteSpace="nowrap" flexShrink={0}>
      {s.label}
    </Box>
  );
}

function VehicleTable({ title, icon, iconColor, visits }) {
  const soft = iconColor === C.blue ? C.blueSoft : C.indigoSoft;
  return (
    <Box bg={C.surface} border={`1px solid ${C.border}`} borderRadius="10px" overflow="hidden">
      <Flex px={4} py={2.5} align="center" gap={2} bg={C.faint} borderBottom={`1px solid ${C.border}`}>
        <Icon as={icon} boxSize={3.5} color={iconColor} />
        <Text fontSize="12px" fontWeight="700" color={C.text}>{title}</Text>
        <Box ml="auto" px={2} py={0.5} bg={soft} borderRadius="5px"
          fontSize="10px" fontWeight="700" color={iconColor}>{visits.length}</Box>
      </Flex>
      <VStack spacing={0} align="stretch" maxH="300px" overflowY="auto"
        sx={{
          "&::-webkit-scrollbar": { width: "3px" },
          "&::-webkit-scrollbar-thumb": { background: C.border, borderRadius: "3px" }
        }}>
        {visits.length === 0 ? (
          <Box px={4} py={5}>
            <Text fontSize="12px" color={C.muted}>No vehicles</Text>
          </Box>
        ) : visits.map((v, i) => (
          <Box key={v.id} px={4} py={2.5}
            borderBottom={i < visits.length - 1 ? `1px solid ${C.border}` : "none"}
            _hover={{ bg: C.faint }} transition="background 0.1s">
            <Flex justify="space-between" align="center" gap={2}>
              <Box minW={0}>
                <Text fontSize="13px" fontWeight="700" color={C.text}>{v.vehicleNumber}</Text>
                <Text fontSize="11px" color={C.muted} isTruncated>{v.customerName}</Text>
              </Box>
              <StatusPill status={v.status} />
            </Flex>
            <Text fontSize="10px" color={C.muted} mt={1}>#{v.id} · {v.createdAt ?? "—"}</Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}