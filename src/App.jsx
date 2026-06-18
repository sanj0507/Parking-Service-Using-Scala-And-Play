import {
  Box, Button, Divider, Flex, FormControl, FormLabel,
  Grid, GridItem, HStack, Icon, Input, SimpleGrid,
  Stack, Text, VStack, useToast
} from "@chakra-ui/react";
import {
  BadgeCheck, BellRing, Car, CarFront, CheckCircle2,
  Clock, CircleDot, KeyRound, LogOut, ParkingCircle,
  RefreshCw, ShieldCheck, Timer, TrendingUp,
  UserRoundCheck, Wrench, Zap, ArrowRight
} from "lucide-react";
import { useMemo, useState } from "react";
import { parkingApi } from "./api/parkingApi.js";

/* ─── Palette ────────────────────────────────────────────────── */
const C = {
  bg:          "#f0f3f8",
  surface:     "#ffffff",
  faint:       "#f7f8fb",
  border:      "#e4e7f0",
  borderFocus: "#bdc3d8",
  text:        "#0f1623",
  sub:         "#4b5568",
  muted:       "#8a92a8",

  sidebar:     "#0f1623",
  sidebarSub:  "#1c2540",
  sidebarLine: "#253045",
  sidebarMuted:"#5a6480",
  sidebarText: "#c8d0e4",

  blue:   "#2563eb", blueSoft:   "#eff6ff",
  teal:   "#0d9488", tealSoft:   "#f0fdfa",
  amber:  "#d97706", amberSoft:  "#fffbeb",
  indigo: "#6366f1", indigoSoft: "#eef2ff",
  green:  "#16a34a", greenSoft:  "#f0fdf4",
  gray:   "#6b7280", graySoft:   "#f9fafb",
  red:    "#dc2626", redSoft:    "#fef2f2",
};

/* ─── Status map ─────────────────────────────────────────────── */
const STATUS = {
  RequestedCheckIn: { label: "Check-In Req",  color: C.teal,   soft: C.tealSoft   },
  CheckedIn:        { label: "Checked In",    color: C.blue,   soft: C.blueSoft   },
  Requested:        { label: "Requested",     color: C.blue,   soft: C.blueSoft   },
  Acknowledged:     { label: "Acknowledged",  color: C.amber,  soft: C.amberSoft  },
  InProgress:       { label: "In Progress",   color: C.amber,  soft: C.amberSoft  },
  Ready:            { label: "Ready",         color: C.green,  soft: C.greenSoft  },
  AddOn:            { label: "Add-on",        color: C.indigo, soft: C.indigoSoft },
  AddOnInProgress:  { label: "Add-On Active", color: C.indigo, soft: C.indigoSoft },
  AddOnCompleted:   { label: "Add-On Done",   color: C.green,  soft: C.greenSoft  },
  CheckedOut:       { label: "Checked Out",   color: C.gray,   soft: C.graySoft   },
};

/* ─── Timeline steps ─────────────────────────────────────────── */
const STEPS = [
  { key: "RequestedCheckIn", label: "Requested",    icon: BellRing,     desc: "Check-in submitted" },
  { key: "CheckedIn",        label: "Checked In",   icon: Car,          desc: "Entered lot" },
  { key: "Acknowledged",     label: "Acknowledged", icon: BadgeCheck,   desc: "Valet confirmed" },
  { key: "InProgress",       label: "In Service",   icon: Wrench,       desc: "Service underway" },
  { key: "Ready",            label: "Ready",        icon: CheckCircle2, desc: "Awaiting pickup" },
  { key: "Requested",        label: "Checkout Req", icon: BellRing,     desc: "Customer on way" },
  { key: "CheckedOut",       label: "Departed",     icon: LogOut,       desc: "Left lot" },
];

/* ─── Constants ──────────────────────────────────────────────── */
const TOTAL = 50;
const ADD_ONS = ["Car Service", "Washing", "Cleaning"];

// Each zone owns a set of statuses — vehicles are routed by their current status
const ZONES = [
  { key: "A", label: "Entry Row",   range: [1,  10], statuses: ["RequestedCheckIn", "CheckedIn"],              color: C.blue   },
  { key: "B", label: "Service Bay", range: [11, 20], statuses: ["Acknowledged", "InProgress"],                color: C.amber  },
  { key: "C", label: "Wash Lane",   range: [21, 30], statuses: ["AddOn", "AddOnInProgress", "AddOnCompleted"], color: C.indigo },
  { key: "D", label: "Ready Lane",  range: [31, 40], statuses: ["Ready", "Requested"],                        color: C.green  },
  { key: "E", label: "Exit Row",    range: [41, 50], statuses: ["CheckedOut"],                                 color: C.gray   },
];

const NAV = [
  { key: "user",     label: "Service Advisor", icon: UserRoundCheck, color: C.blue   },
  { key: "valet",    label: "Valet",           icon: KeyRound,       color: C.teal   },
  { key: "admin",    label: "Admin",           icon: ShieldCheck,    color: C.amber  },
  { key: "timeline", label: "Vehicle Tracker", icon: Clock,          color: C.indigo },
];
const ACT = {
  create: "Check-In Requested",   acknowledge: "Request Approved",
  ready:  "Vehicle Ready",        checkout:    "Checked Out",
  request:"Checkout Requested",   addon:       "Add-On Requested",
  loadAddOns:"Add-Ons Loaded",    startAddOn:  "Add-On Started",
  completeAddOn:"Add-On Completed", load:      "Visits Loaded",
};

function buildSlots(allVisits) {
  // Bucket vehicles into zones by their status
  const buckets = {};
  ZONES.forEach(z => { buckets[z.key] = []; });

  allVisits.forEach(v => {
    const zone = ZONES.find(z => z.statuses.includes(v.status));
    if (zone) buckets[zone.key].push(v);
    // Unrecognised statuses go to A as fallback
    else buckets["A"].push(v);
  });

  // Build all 50 slot objects
  return Array.from({ length: TOTAL }, (_, i) => {
    const n    = i + 1;
    const zone = ZONES.find(z => n >= z.range[0] && n <= z.range[1]);
    const zKey = zone?.key ?? "A";
    // Position within the zone (0-based)
    const posInZone = n - zone.range[0];
    const vehicle   = buckets[zKey][posInZone] ?? null;
    return {
      id: n,
      code: `${zKey}-${String(n).padStart(2, "0")}`,
      zone: zKey,
      vehicle,
      occupied: !!vehicle,
    };
  });
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab]         = useState("user");
  const [visitId, setVisitId] = useState("");
  const [tlId, setTlId]       = useState("");
  const [tlVisit, setTlVisit] = useState(null);
  const [tlLoading, setTlLoading] = useState(false);
  const [form, setForm]       = useState({ vehicleNumber: "", customerName: "", mobileNumber: "" });
  const [addon, setAddon]     = useState(ADD_ONS[0]);
  const [apiResp, setApiResp] = useState(null);
  const [visits, setVisits]   = useState([]);
  const [addOns, setAddOns]   = useState([]);
  const [busy, setBusy]       = useState("");
  const toast = useToast();

  const nav    = NAV.find(n => n.key === tab) ?? NAV[0];
  const role   = tab === "timeline" ? "admin" : tab;
  const active = visits.filter(v => v.status !== "CheckedOut");
  const slots  = useMemo(() => buildSlots(visits), [visits]);
  const m      = useMemo(() => ({
    active:  visits.filter(v => v.status !== "CheckedOut").length,
    waiting: visits.filter(v => ["RequestedCheckIn","Requested"].includes(v.status)).length,
    ready:   visits.filter(v => v.status === "Ready").length,
    done:    visits.filter(v => v.status === "CheckedOut").length,
    free:    Math.max(0, TOTAL - visits.filter(v => v.status !== "CheckedOut").length),
  }), [visits]);

  async function run(action, r = role) {
    setBusy(`${r}:${action}`);
    try {
      const res = await go(action, r);
      setApiResp({ ok: true, label: ACT[action], body: res });
      toast({ title: ACT[action], status: "success", duration: 2000, isClosable: true, position: "bottom-right" });
    } catch (e) {
      setApiResp({ ok: false, label: "Failed", body: { error: e.message } });
      toast({ title: "Failed", description: e.message, status: "error", duration: 3000, isClosable: true, position: "bottom-right" });
    } finally { setBusy(""); }
  }

  async function go(action, r) {
    if (!["load","create"].includes(action) && !visitId) throw new Error("Visit ID required");
    switch (action) {
      case "create":
        if (!form.vehicleNumber.trim()) throw new Error("Vehicle number required");
        if (!form.customerName.trim())  throw new Error("Customer name required");
        return parkingApi.createVisit(r, { ...form, status: "RequestedCheckIn" });
      case "acknowledge":   return parkingApi.acknowledge(r, visitId);
      case "ready":         return parkingApi.markReady(r, visitId);
      case "request":       return parkingApi.requestCheckout(r, visitId);
      case "checkout":      return parkingApi.checkOut(r, visitId);
      case "addon":         return parkingApi.addOn(r, visitId, addon);
      case "loadAddOns": {
        const res = await parkingApi.getAddOns(r, visitId);
        setAddOns(res.body?.data ?? []);
        return res;
      }
      case "startAddOn":    return parkingApi.startAddOn(r, visitId, addon);
      case "completeAddOn": return parkingApi.completeAddOn(r, visitId, addon);
      case "load": {
        const res = await parkingApi.loadVisits();
        setVisits(res.body?.data ?? []);
        return res;
      }
      default: throw new Error("Unknown action");
    }
  }

  async function trackTimeline() {
    if (!tlId) { toast({ title: "Enter a Visit ID", status: "warning", duration: 2000, position: "bottom-right" }); return; }
    setTlLoading(true);
    try {
      const r = await parkingApi.getVisit("admin", tlId);
      setTlVisit(r.body?.data ?? r.body ?? null);
    } catch (e) {
      toast({ title: "Not found", description: e.message, status: "error", duration: 3000, position: "bottom-right" });
      setTlVisit(null);
    } finally { setTlLoading(false); }
  }

  const occupancy = Math.round(m.active / TOTAL * 100);

  return (
    <Flex minH="100vh" bg={C.bg} fontFamily="'Inter', system-ui, sans-serif" color={C.text}>

      {/* ── Sidebar ── */}
      <Box as="nav" w="232px" flexShrink={0} bg={C.sidebar}
        display={{ base: "none", lg: "flex" }} flexDirection="column"
        position="sticky" top={0} h="100vh">

        {/* Brand */}
        <Flex align="center" gap={3} px={5} py={5} borderBottom={`1px solid ${C.sidebarLine}`}>
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

        {/* Nav */}
        <Box flex={1} px={3} pt={5}>
          <Text fontSize="9px" fontWeight="700" color={C.sidebarMuted}
            letterSpacing="0.16em" px={3} mb={2}>WORKSPACES</Text>
          <VStack spacing={0.5}>
            {NAV.map(item => {
              const on = tab === item.key;
              return (
                <Flex key={item.key} as="button" w="full" align="center" gap={2.5}
                  px={3} py={2.5} borderRadius="8px"
                  bg={on ? C.sidebarSub : "transparent"}
                  onClick={() => setTab(item.key)}
                  transition="background 0.12s" _hover={{ bg: C.sidebarSub }}
                  position="relative">
                  {on && <Box position="absolute" left={0} top="50%" transform="translateY(-50%)"
                    w="2.5px" h="16px" bg={item.color} borderRadius="0 3px 3px 0" />}
                  <Flex w="26px" h="26px" borderRadius="7px"
                    bg={on ? item.color + "28" : "#ffffff0e"}
                    align="center" justify="center" flexShrink={0}>
                    <Icon as={item.icon} boxSize={3.5} color={on ? item.color : C.sidebarMuted} />
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
            {NAV.map(item => (
              <Flex key={item.key} as="button" w="32px" h="32px" borderRadius="8px"
                align="center" justify="center"
                bg={tab === item.key ? item.color + "15" : C.faint}
                border={`1px solid ${tab === item.key ? item.color + "50" : C.border}`}
                onClick={() => setTab(item.key)}>
                <Icon as={item.icon} boxSize={3.5} color={tab === item.key ? item.color : C.muted} />
              </Flex>
            ))}
          </HStack>
        </Flex>

        <Box px={{ base: 5, md: 8 }} py={6}>
          <Stack spacing={5}>

            {/* ── Hero banner ── */}
            <Box bg={C.sidebar} borderRadius="14px" overflow="hidden" position="relative"
              boxShadow="0 4px 24px rgba(15,22,35,0.14)">
              {/* Grid texture */}
              <Box position="absolute" inset={0} opacity={0.05}
                bgImage="linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)"
                bgSize="32px 32px" pointerEvents="none" />
              <Flex position="relative" px={{ base: 5, md: 7 }} py={{ base: 5, md: 6 }}
                justify="space-between" align="center"
                direction={{ base: "column", md: "row" }} gap={5}>
                <Box>
                  <HStack spacing={2} mb={2}>
                    <Icon as={ParkingCircle} boxSize={3.5} color={C.teal} />
                    <Text fontSize="10px" fontWeight="700" color="#7b9ab8" letterSpacing="0.14em">
                      PARKING LOT DASHBOARD
                    </Text>
                  </HStack>
                  <Text fontSize={{ base: "20px", md: "26px" }} fontWeight="800"
                    color="white" lineHeight={1.2}>
                    Live lot map, valet flow<br />and vehicle requests.
                  </Text>
                  <Text fontSize="13px" color="#8fadc6" mt={2} lineHeight={1.65} maxW="420px">
                    Track slots, pending arrivals, ready vehicles, and service add-ons — all in one console.
                  </Text>
                </Box>
                {/* Occupancy pill */}
                <Box bg="#ffffff0c" border="1px solid #ffffff18" borderRadius="12px"
                  px={5} py={4} textAlign="center" minW="160px" flexShrink={0}>
                  <Text fontSize="9px" fontWeight="700" color="#7b9ab8" letterSpacing="0.14em">OCCUPANCY</Text>
                  <Text fontSize="36px" fontWeight="900" color="white" lineHeight={1} mt={1.5}>
                    {occupancy}%
                  </Text>
                  <Text fontSize="11px" color="#8fadc6" mt={0.5}>{m.active} active · {m.free} free</Text>
                  <Box h="5px" bg="#ffffff14" borderRadius="999px" overflow="hidden" mt={3}>
                    <Box h="full" w={`${occupancy}%`}
                      bg="linear-gradient(90deg,#0d9488,#16a34a)" transition="width 0.4s" borderRadius="999px" />
                  </Box>
                </Box>
              </Flex>
            </Box>

            {/* ── Metric cards ── */}
            <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={3}>
              {[
                { icon: Car,           label: "Active",     value: m.active,  color: C.blue,   soft: C.blueSoft   },
                { icon: Timer,         label: "Waiting",    value: m.waiting, color: C.amber,  soft: C.amberSoft  },
                { icon: Zap,           label: "Ready",      value: m.ready,   color: C.green,  soft: C.greenSoft  },
                { icon: TrendingUp,    label: "Completed",  value: m.done,    color: C.indigo, soft: C.indigoSoft },
                { icon: ParkingCircle, label: "Free Slots", value: m.free,    color: C.teal,   soft: C.tealSoft, suffix: `/${TOTAL}` },
              ].map(c => (
                <Box key={c.label} bg={C.surface} border={`1px solid ${C.border}`}
                  borderTop={`3px solid ${c.color}`} borderRadius="12px" p={4}
                  _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.07)", transform: "translateY(-1px)" }}
                  transition="all 0.18s">
                  <Flex w="30px" h="30px" borderRadius="8px" bg={c.soft}
                    align="center" justify="center" mb={3}>
                    <Icon as={c.icon} boxSize={3.5} color={c.color} />
                  </Flex>
                  <Text fontSize="24px" fontWeight="800" color={C.text} lineHeight={1}>
                    {c.value}
                    {c.suffix && <Text as="span" fontSize="12px" color={C.muted} fontWeight="500" ml={0.5}>{c.suffix}</Text>}
                  </Text>
                  <Text fontSize="11px" color={C.muted} mt={1}>{c.label}</Text>
                </Box>
              ))}
            </SimpleGrid>

            {/* ── Lot map ── */}
            <Grid templateColumns={{ base: "1fr", xl: "1.35fr 0.65fr" }} gap={5}>
              <GridItem>
                <Card>
                  <Flex justify="space-between" align="center" mb={5}>
                    <Box>
                      <SLabel>Parking Slot Map</SLabel>
                      <Text fontSize="12px" color={C.muted} mt={0.5}>
                        Vehicles move into their zone based on current status
                      </Text>
                    </Box>
                    <HStack spacing={3} flexWrap="wrap" justify="flex-end">
                      {ZONES.map(z => (
                        <HStack key={z.key} spacing={1.5}>
                          <Box w="7px" h="7px" borderRadius="full" bg={z.color} />
                          <Text fontSize="10px" color={C.muted}>{z.key} · {z.label}</Text>
                        </HStack>
                      ))}
                    </HStack>
                  </Flex>
                  <Stack spacing={5}>
                    {ZONES.map(zone => {
                      const zs = slots.filter(s => s.zone === zone.key);
                      const occupiedCount = zs.filter(s => s.occupied).length;
                      return (
                        <Box key={zone.key}>
                          <Flex justify="space-between" align="center" mb={2}>
                            <HStack spacing={2}>
                              <Box w="8px" h="8px" borderRadius="full" bg={zone.color} />
                              <Text fontSize="12px" color={C.sub}>
                                <Text as="span" fontWeight="700" color={C.text} mr={1}>{zone.key}</Text>
                                {zone.label}
                              </Text>
                              {/* Status tags for zone */}
                              <HStack spacing={1} display={{ base: "none", md: "flex" }}>
                                {zone.statuses.map(s => (
                                  <Box key={s} px={1.5} py={0.5} borderRadius="4px"
                                    bg={zone.color + "14"} border={`1px solid ${zone.color}28`}
                                    fontSize="9px" fontWeight="700" color={zone.color} letterSpacing="0.04em">
                                    {STATUS[s]?.label ?? s}
                                  </Box>
                                ))}
                              </HStack>
                            </HStack>
                            <Text fontSize="11px" color={occupiedCount > 0 ? zone.color : C.muted} fontWeight={occupiedCount > 0 ? "700" : "400"}>
                              {occupiedCount}/{zs.length}
                            </Text>
                          </Flex>
                          <SimpleGrid columns={{ base: 5, sm: 10 }} spacing={1.5}>
                            {zs.map(slot => {
                              const occupied = slot.occupied;
                              return (
                                <Box key={slot.code} h="46px" borderRadius="7px"
                                  bg={occupied ? zone.color + "14" : "#f7f8fb"}
                                  border={`1px solid ${occupied ? zone.color + "55" : C.border}`}
                                  p={1.5} display="flex" flexDirection="column" justifyContent="space-between"
                                  transition="all 0.2s"
                                  title={slot.vehicle ? `${slot.code}: ${slot.vehicle.vehicleNumber} (${slot.vehicle.status})` : `${slot.code}: free`}>
                                  <Text fontSize="9px" fontWeight="800" color={occupied ? zone.color : C.muted} lineHeight={1}>{slot.code}</Text>
                                  <Text fontSize="8px" fontWeight="600" color={occupied ? C.text : C.muted} isTruncated>
                                    {slot.vehicle?.vehicleNumber ?? "Free"}
                                  </Text>
                                </Box>
                              );
                            })}
                          </SimpleGrid>
                        </Box>
                      );
                    })}
                  </Stack>
                </Card>
              </GridItem>

              <GridItem>
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
                  <VStack spacing={2} align="stretch">
                    {active.length === 0 ? (
                      <Flex direction="column" align="center" gap={2} py={8}
                        borderRadius="10px" bg={C.faint} border={`1.5px dashed ${C.border}`}>
                        <Icon as={ParkingCircle} boxSize={6} color={C.muted} />
                        <Text fontSize="12px" color={C.muted}>Refresh admin data to populate</Text>
                      </Flex>
                    ) : active.slice(0, 6).map(v => {
                        const vZone = ZONES.find(z => z.statuses.includes(v.status)) ?? ZONES[0];
                        return (
                        <Flex key={v.id} align="center" gap={3} px={3} py={2.5}
                          border={`1px solid ${C.border}`} borderRadius="10px"
                          _hover={{ bg: C.faint }} transition="background 0.1s">
                          <Flex w="34px" h="34px" borderRadius="8px"
                            bg={vZone.color + "18"}
                            align="center" justify="center" flexShrink={0}>
                            <Icon as={CarFront} boxSize={4} color={vZone.color} />
                          </Flex>
                          <Box flex={1} minW={0}>
                            <Text fontSize="13px" fontWeight="700" color={C.text}>{v.vehicleNumber}</Text>
                            <Text fontSize="11px" color={C.muted} isTruncated>
                              {v.customerName} · <Text as="span" color={vZone.color} fontWeight="600">{vZone.key} – {vZone.label}</Text>
                            </Text>
                          </Box>
                          <StatusPill status={v.status} />
                        </Flex>
                        );
                      })}
                  </VStack>
                </Card>
              </GridItem>
            </Grid>

            {/* ── Work panel + API response ── */}
            <Grid templateColumns={{ base: "1fr", xl: "1fr 340px" }} gap={5} alignItems="start">
              <GridItem>
                <Card>
                  {/* Tab header */}
                  <Flex align="center" gap={3} pb={5} mb={5} borderBottom={`1px solid ${C.border}`}>
                    <Flex w="36px" h="36px" borderRadius="9px"
                      bg={tab==="user"?C.blueSoft:tab==="valet"?C.tealSoft:tab==="admin"?C.amberSoft:C.indigoSoft}
                      align="center" justify="center" flexShrink={0}>
                      <Icon as={nav.icon} boxSize={4} color={nav.color} />
                    </Flex>
                    <Box>
                      <Text fontSize="14px" fontWeight="700" color={C.text}>{nav.label}</Text>
                      <Text fontSize="11px" color={C.muted}>
                        {tab==="user"?"Check vehicles in and out"
                         :tab==="valet"?"Manage vehicle handoffs"
                         :tab==="admin"?"Monitor all lot activity"
                         :"Track any vehicle's journey"}
                      </Text>
                    </Box>
                  </Flex>

                  {/* USER */}
                  {tab === "user" && (
                    <Stack spacing={6} divider={<Divider borderColor={C.border} />}>
                      <Section label="Request Check-In">
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mt={3}>
                          <Field label="Vehicle No." value={form.vehicleNumber} onChange={e=>setForm({...form,vehicleNumber:e.target.value})} placeholder="TN01AB1234" required />
                          <Field label="Customer Name" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="John Doe" required />
                          <Field label="Mobile" value={form.mobileNumber} onChange={e=>setForm({...form,mobileNumber:e.target.value})} placeholder="9876543210" />
                        </SimpleGrid>
                        <AppBtn mt={4} color={C.blue} soft={C.blueSoft} icon={CarFront} loading={busy==="user:create"} onClick={()=>run("create","user")}>
                          Request Check-In
                        </AppBtn>
                      </Section>

                      <Section label="Request Check-Out">
                        <Box maxW="200px" mt={3}>
                          <Field label="Visit ID" value={visitId} onChange={e=>setVisitId(e.target.value)} placeholder="101" type="number" />
                        </Box>
                        <AppBtn mt={4} color={C.blue} soft={C.blueSoft} icon={BellRing} outline loading={busy==="user:request"} onClick={()=>run("request","user")}>
                          Request Check-Out
                        </AppBtn>
                      </Section>

                      <Section label="Add-On Services">
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={3} maxW="440px">
                          <Field label="Visit ID" value={visitId} onChange={e=>setVisitId(e.target.value)} placeholder="101" type="number" />
                          <FormControl>
                            <FormLabel fontSize="11px" fontWeight="600" color={C.muted} letterSpacing="0.06em" mb={1.5}>Service</FormLabel>
                            <Input list="uo" value={addon} onChange={e=>setAddon(e.target.value)}
                              bg={C.surface} border={`1px solid ${C.border}`} borderRadius="9px"
                              color={C.text} fontSize="13px"
                              _focus={{ borderColor: C.borderFocus, boxShadow: "none" }} />
                            <datalist id="uo">{ADD_ONS.map(o=><option key={o} value={o}/>)}</datalist>
                          </FormControl>
                        </SimpleGrid>
                        <AppBtn mt={4} color={C.indigo} soft={C.indigoSoft} icon={Wrench} outline loading={busy==="user:addon"} onClick={()=>run("addon","user")}>
                          Request Add-On
                        </AppBtn>
                      </Section>
                    </Stack>
                  )}

                  {/* VALET */}
                  {tab === "valet" && (
                    <Stack spacing={6} divider={<Divider borderColor={C.border} />}>
                      <Section label="Visit Actions">
                        <Box maxW="200px" mt={3} mb={4}>
                          <Field label="Visit ID" value={visitId} onChange={e=>setVisitId(e.target.value)} placeholder="101" type="number" />
                        </Box>
                        <Stack spacing={2}>
                          <ActionRow color={C.teal}   soft={C.tealSoft}   icon={BadgeCheck}   title="Approve Request"  sub="Approve check-in and update status"   loading={busy==="valet:acknowledge"} onClick={()=>run("acknowledge","valet")} />
                          <ActionRow color={C.green}  soft={C.greenSoft}  icon={CheckCircle2} title="Mark Ready"       sub="Vehicle serviced, awaiting pickup"     loading={busy==="valet:ready"}       onClick={()=>run("ready","valet")} />
                          <ActionRow color={C.indigo} soft={C.indigoSoft} icon={CarFront}     title="Accept Checkout"  sub="Confirm handoff to customer"           loading={busy==="valet:checkout"}    onClick={()=>run("checkout","valet")} />
                        </Stack>
                      </Section>

                      <Section label="Add-On Work">
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={3} mb={4} maxW="440px">
                          <Field label="Visit ID" value={visitId} onChange={e=>setVisitId(e.target.value)} placeholder="101" type="number" />
                          <FormControl>
                            <FormLabel fontSize="11px" fontWeight="600" color={C.muted} letterSpacing="0.06em" mb={1.5}>Service</FormLabel>
                            <Input list="vo" value={addon} onChange={e=>setAddon(e.target.value)}
                              bg={C.surface} border={`1px solid ${C.border}`} borderRadius="9px"
                              color={C.text} fontSize="13px"
                              _focus={{ borderColor: C.borderFocus, boxShadow: "none" }} />
                            <datalist id="vo">{ADD_ONS.map(o=><option key={o} value={o}/>)}</datalist>
                          </FormControl>
                        </SimpleGrid>
                        <Stack spacing={2}>
                          <ActionRow color={C.blue}  soft={C.blueSoft}  icon={RefreshCw}    title="Load Add-Ons"    sub="View add-on requests for this visit"     loading={busy==="valet:loadAddOns"}    onClick={()=>run("loadAddOns","valet")} />
                          <ActionRow color={C.amber} soft={C.amberSoft} icon={Wrench}       title="Start Add-On"   sub="Begin the selected extra service"         loading={busy==="valet:startAddOn"}    onClick={()=>run("startAddOn","valet")} />
                          <ActionRow color={C.green} soft={C.greenSoft} icon={CheckCircle2} title="Complete Add-On" sub="Mark the extra feature complete"         loading={busy==="valet:completeAddOn"} onClick={()=>run("completeAddOn","valet")} />
                        </Stack>
                        {addOns.length > 0 && (
                          <Stack spacing={2} mt={4}>
                            {addOns.map(a => (
                              <Flex key={a.id} align="center" justify="space-between" gap={3}
                                px={3} py={2.5} border={`1px solid ${C.border}`} borderRadius="9px" bg={C.faint}>
                                <Box>
                                  <Text fontSize="13px" fontWeight="600" color={C.text}>{a.serviceName}</Text>
                                  <Text fontSize="10px" color={C.muted}>Visit #{a.visitId} · {a.createdAt ?? "n/a"}</Text>
                                </Box>
                                <StatusPill status={a.status} />
                              </Flex>
                            ))}
                          </Stack>
                        )}
                      </Section>
                    </Stack>
                  )}

                  {/* ADMIN */}
                  {tab === "admin" && (
                    <Stack spacing={5}>
                      <Flex justify="space-between" align="center">
                        <SLabel>Live Vehicle Data</SLabel>
                        <AppBtn color={C.amber} soft={C.amberSoft} icon={RefreshCw} size="sm"
                          loading={busy==="admin:load"} onClick={()=>run("load","admin")}>
                          Refresh
                        </AppBtn>
                      </Flex>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <VehicleTable title="In Lot"      icon={Car}        iconColor={C.blue}   visits={active} />
                        <VehicleTable title="All History" icon={TrendingUp} iconColor={C.indigo} visits={visits} />
                      </SimpleGrid>
                    </Stack>
                  )}

                  {/* TIMELINE */}
                  {tab === "timeline" && (
                    <Stack spacing={5}>
                      <Section label="Look Up Visit">
                        <HStack mt={3} spacing={3} align="flex-end" maxW="340px">
                          <Box flex={1}>
                            <Field label="Visit ID" value={tlId} onChange={e=>setTlId(e.target.value)} placeholder="101" type="number" />
                          </Box>
                          <AppBtn color={C.indigo} soft={C.indigoSoft} icon={CircleDot} loading={tlLoading} onClick={trackTimeline}>
                            Track
                          </AppBtn>
                        </HStack>
                      </Section>

                      {!tlVisit && !tlLoading && (
                        <Flex direction="column" align="center" gap={2} py={10}
                          borderRadius="10px" bg={C.faint} border={`1.5px dashed ${C.border}`}>
                          <Icon as={Clock} boxSize={6} color={C.muted} />
                          <Text fontSize="12px" color={C.muted}>Enter a Visit ID to see its journey</Text>
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
                                const cur   = order.indexOf(tlVisit.status);
                                const done  = i <= cur;
                                const now   = step.key === tlVisit.status;
                                const cfg   = STATUS[step.key] ?? STATUS["CheckedOut"];
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
                              { k: "Customer",   v: tlVisit.customerName ?? "—" },
                              { k: "Mobile",     v: tlVisit.mobileNumber  ?? "—" },
                              { k: "Checked In", v: tlVisit.createdAt     ?? "—" },
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
              </GridItem>

              {/* ── API Response ── */}
              <GridItem>
                <Box bg={C.surface} border={`1px solid ${C.border}`} borderRadius="12px"
                  overflow="hidden" position={{ xl: "sticky" }} top={{ xl: "76px" }}>
                  {/* Header */}
                  <Flex px={4} py={3} bg={C.faint} borderBottom={`1px solid ${C.border}`}
                    align="center" justify="space-between">
                    <HStack spacing={2}>
                      <Box w="6px" h="6px" borderRadius="full"
                        bg={apiResp?.ok === false ? C.red : apiResp ? C.green : C.muted} />
                      <Text fontSize="10px" fontWeight="700" color={C.muted} letterSpacing="0.1em">
                        API RESPONSE
                      </Text>
                    </HStack>
                    {apiResp && (
                      <Box px={2} py={0.5} borderRadius="5px" fontSize="10px" fontWeight="700"
                        letterSpacing="0.08em"
                        bg={apiResp.ok ? C.greenSoft : C.redSoft}
                        color={apiResp.ok ? C.green : C.red}
                        border={`1px solid ${apiResp.ok ? C.green : C.red}30`}>
                        {apiResp.ok ? "200 OK" : "ERROR"}
                      </Box>
                    )}
                  </Flex>

                  {apiResp ? (
                    <>
                      <Box px={4} py={3} borderBottom={`1px solid ${C.border}`}>
                        <Text fontSize="12px" fontWeight="600" color={C.text}>{apiResp.label}</Text>
                        <Text fontSize="11px" color={C.muted} mt={0.5}>{new Date().toLocaleTimeString()}</Text>
                      </Box>
                      <Box as="pre" px={4} py={4} fontSize="11px" color="#1d4ed8" bg="#f8faff"
                        overflowX="auto" lineHeight="1.85" fontFamily="'JetBrains Mono',monospace"
                        maxH="300px" overflowY="auto"
                        sx={{ "&::-webkit-scrollbar": { width: "3px", height: "3px" },
                              "&::-webkit-scrollbar-thumb": { background: C.border, borderRadius: "3px" } }}>
                        {JSON.stringify(apiResp.body, null, 2)}
                      </Box>
                    </>
                  ) : (
                    <Flex direction="column" align="center" gap={2} py={10} px={5}>
                      <Icon as={ArrowRight} boxSize={5} color={C.muted} />
                      <Text fontSize="12px" color={C.muted} textAlign="center">
                        Run an action to see the response
                      </Text>
                    </Flex>
                  )}

                  {/* Status legend */}
                  <Box px={4} py={4} borderTop={`1px solid ${C.border}`} bg={C.faint}>
                    <Text fontSize="9px" fontWeight="700" color={C.muted}
                      letterSpacing="0.14em" mb={2.5}>STATUS LEGEND</Text>
                    <SimpleGrid columns={2} spacing={1.5}>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <HStack key={k} spacing={1.5}>
                          <Box w="6px" h="6px" borderRadius="full" bg={v.color} flexShrink={0} />
                          <Text fontSize="10px" color={C.muted}>{v.label}</Text>
                        </HStack>
                      ))}
                    </SimpleGrid>
                  </Box>
                </Box>
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
        sx={{ "&::-webkit-scrollbar": { width: "3px" },
              "&::-webkit-scrollbar-thumb": { background: C.border, borderRadius: "3px" } }}>
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