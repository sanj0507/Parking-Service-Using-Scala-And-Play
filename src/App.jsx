import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  VStack,
  useColorModeValue,
  useToast
} from "@chakra-ui/react";
import {
  BellRing,
  CarFront,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  ShieldCheck,
  UserRoundCheck,
  BadgeCheck,
  RefreshCw
} from "lucide-react";
import { useMemo, useState } from "react";
import { parkingApi } from "./api/parkingApi.js";

const roleCards = [
  {
    key: "user",
    title: "User",
    icon: UserRoundCheck,
    accent: "#2563eb",
    tag: "SERVICE ADVISOR",
    description: "Bring a vehicle to the lot and request check-in or check-out.",
    permissions: ["Create Check-In", "Request Check-Out"]
  },
  {
    key: "valet",
    title: "Valet",
    icon: KeyRound,
    accent: "#0d9488",
    tag: "VALET OPS",
    description: "Accept customer requests and mark vehicles ready for check-out.",
    permissions: ["Acknowledge", "Mark Ready", "Accept Checkout"]
  },
  {
    key: "admin",
    title: "Admin",
    icon: ShieldCheck,
    accent: "#d97706",
    tag: "ADMIN",
    description: "Monitor active vehicles and view complete entry/exit history.",
    permissions: ["Checked-In List", "Full History"]
  }
];

const actionLabels = {
  create: "Request Check-In",
  acknowledge: "Acknowledge Visit",
  ready: "Mark Ready",
  checkout: "Accept Checkout",
  request: "Request Check-Out",
  load: "Load Visits"
};

const emptyResponse = {
  title: "AWAITING REQUEST",
  detail: "Run an action to see the API result here.",
  body: null
};

export default function App() {
  const [activeRole, setActiveRole] = useState("user");
  const [visitId, setVisitId] = useState("");
  const [form, setForm] = useState({ vehicleNumber: "", customerName: "", mobileNumber: "" });
  const [response, setResponse] = useState(emptyResponse);
  const [visits, setVisits] = useState([]);
  const [busyAction, setBusyAction] = useState("");
  const toast = useToast();

  const selectedRole = roleCards.find((r) => r.key === activeRole) || roleCards[0];
  const activeVehicles = visits.filter((v) => v.status !== "CheckedOut");
  const historyVehicles = visits;

  const bg = useColorModeValue("#f8f7f4", "gray.950");
  const cardBg = useColorModeValue("white", "gray.900");
  const border = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const labelColor = useColorModeValue("gray.400", "gray.500");

  const responseText = useMemo(() => {
    if (!response.body) return response.detail;
    return JSON.stringify(response.body, null, 2);
  }, [response]);

  async function runAction(action, role = activeRole) {
    setBusyAction(`${role}:${action}`);
    try {
      const result = await dispatchAction(action, role);
      setResponse({ title: actionLabels[action] || "Success", detail: "Request completed.", body: result });
      toast({ title: actionLabels[action], status: "success", duration: 2000, isClosable: true, position: "bottom-right" });
    } catch (error) {
      setResponse({ title: "ERROR", detail: error.message, body: { error: error.message } });
      toast({ title: "Failed", description: error.message, status: "error", duration: 3000, isClosable: true, position: "bottom-right" });
    } finally {
      setBusyAction("");
    }
  }

  async function dispatchAction(action, role) {
    if (action !== "load" && action !== "create" && !visitId) throw new Error("Visit ID is required");
    switch (action) {
      case "create":
        if (!form.vehicleNumber.trim()) throw new Error("Vehicle number is required");
        if (!form.customerName.trim()) throw new Error("Customer name is required");
        return parkingApi.createVisit(role, {
          vehicleNumber: form.vehicleNumber,
          customerName: form.customerName,
          mobileNumber: form.mobileNumber,
          status: "CheckedIn"
        });
      case "acknowledge": return parkingApi.acknowledge(role, visitId);
      case "ready": return parkingApi.markReady(role, visitId);
      case "request": return parkingApi.requestCheckout(role, visitId);
      case "checkout": return parkingApi.checkOut(role, visitId);
      case "load": {
        const result = await parkingApi.loadVisits();
        setVisits(result.body?.data || []);
        return result;
      }
      default: throw new Error("Unknown action");
    }
  }

  return (
    <Box minH="100vh" bg={bg} fontFamily="'DM Mono', monospace">
      {/* Header */}
      <Box borderBottom="2px solid" borderColor="gray.900" bg="gray.900" color="white">
        <Container maxW="7xl" py={5}>
          <Flex align="center" justify="space-between">
            <Box>
              <HStack spacing={3} align="center">
                <Box w="10px" h="10px" bg={selectedRole.accent} borderRadius="full" />
                <Text fontSize="xs" letterSpacing="0.2em" color="gray.400" fontWeight="600">
                  PARKING OPS
                </Text>
              </HStack>
              <Heading
                mt={1}
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight="800"
                letterSpacing="-0.02em"
                fontFamily="'DM Mono', monospace"
              >
                Operations Dashboard
              </Heading>
            </Box>
            <Box
              px={3}
              py={1}
              border="1px solid"
              borderColor="gray.600"
              borderRadius="md"
              fontSize="xs"
              letterSpacing="0.15em"
              color="gray.400"
            >
              {selectedRole.tag}
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" pt={8} pb={14}>
        <Stack spacing={6}>

          {/* Role Switcher */}
          <Flex gap={0} borderRadius="lg" overflow="hidden" border="1.5px solid" borderColor={border} w="fit-content">
            {roleCards.map((role, i) => (
              <Box
                key={role.key}
                as="button"
                onClick={() => setActiveRole(role.key)}
                px={5}
                py={3}
                fontFamily="'DM Mono', monospace"
                fontSize="xs"
                letterSpacing="0.12em"
                fontWeight="700"
                transition="all 0.15s"
                borderRight={i < roleCards.length - 1 ? "1.5px solid" : "none"}
                borderColor={border}
                bg={activeRole === role.key ? "gray.900" : "white"}
                color={activeRole === role.key ? "white" : muted}
                _hover={{ bg: activeRole === role.key ? "gray.900" : "gray.50" }}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Box
                  w="6px"
                  h="6px"
                  borderRadius="full"
                  bg={activeRole === role.key ? role.accent : "gray.300"}
                  flexShrink={0}
                />
                {role.title.toUpperCase()}
              </Box>
            ))}
          </Flex>

          {/* Role Description Strip */}
          <Box
            borderLeft="3px solid"
            borderColor={selectedRole.accent}
            pl={4}
            py={1}
          >
            <Text fontSize="sm" color={muted}>{selectedRole.description}</Text>
            <HStack spacing={2} mt={1.5} flexWrap="wrap">
              {selectedRole.permissions.map((p) => (
                <Text
                  key={p}
                  fontSize="xs"
                  letterSpacing="0.1em"
                  color={labelColor}
                  border="1px solid"
                  borderColor={border}
                  px={2}
                  py={0.5}
                  borderRadius="sm"
                >
                  {p}
                </Text>
              ))}
            </HStack>
          </Box>

          {/* Main Grid */}
          <Grid templateColumns={{ base: "1fr", xl: "1fr 420px" }} gap={6} alignItems="start">
            <GridItem>
              {/* USER PANEL */}
              {activeRole === "user" && (
                <PanelCard accent={selectedRole.accent} cardBg={cardBg} border={border}>
                  <SectionLabel>Check-In</SectionLabel>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                    <FieldInput label="Vehicle No." value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="TN01AB1234" required />
                    <FieldInput label="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="John" required />
                    <FieldInput label="Mobile" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} placeholder="9876543210" />
                  </SimpleGrid>
                  <ActionButton
                    mt={5}
                    accent={selectedRole.accent}
                    icon={CarFront}
                    isLoading={busyAction === "user:create"}
                    onClick={() => runAction("create", "user")}
                  >
                    Request Check-In
                  </ActionButton>

                  <Divider my={6} borderColor={border} />

                  <SectionLabel>Check-Out Request</SectionLabel>
                  <Box mt={4} maxW="260px">
                    <FieldInput label="Visit ID" value={visitId} onChange={(e) => setVisitId(e.target.value)} placeholder="101" type="number" required />
                  </Box>
                  <ActionButton
                    mt={4}
                    accent={selectedRole.accent}
                    icon={BellRing}
                    variant="outline"
                    isLoading={busyAction === "user:request"}
                    onClick={() => runAction("request", "user")}
                  >
                    Request Check-Out
                  </ActionButton>
                </PanelCard>
              )}

              {/* VALET PANEL */}
              {activeRole === "valet" && (
                <PanelCard accent={selectedRole.accent} cardBg={cardBg} border={border}>
                  <SectionLabel>Visit Actions</SectionLabel>
                  <Box mt={4} maxW="260px">
                    <FieldInput label="Visit ID" value={visitId} onChange={(e) => setVisitId(e.target.value)} placeholder="101" type="number" required />
                  </Box>
                  <HStack mt={5} spacing={3} flexWrap="wrap">
                    <ActionButton accent={selectedRole.accent} icon={BadgeCheck} isLoading={busyAction === "valet:acknowledge"} onClick={() => runAction("acknowledge", "valet")}>
                      Acknowledge
                    </ActionButton>
                    <ActionButton accent={selectedRole.accent} icon={CheckCircle2} variant="outline" isLoading={busyAction === "valet:ready"} onClick={() => runAction("ready", "valet")}>
                      Mark Ready
                    </ActionButton>
                    <ActionButton accent={selectedRole.accent} icon={CarFront} variant="outline" isLoading={busyAction === "valet:checkout"} onClick={() => runAction("checkout", "valet")}>
                      Accept Checkout
                    </ActionButton>
                  </HStack>
                </PanelCard>
              )}

              {/* ADMIN PANEL */}
              {activeRole === "admin" && (
                <PanelCard accent={selectedRole.accent} cardBg={cardBg} border={border}>
                  <Flex justify="space-between" align="center">
                    <SectionLabel>Vehicle Monitor</SectionLabel>
                    <ActionButton
                      accent={selectedRole.accent}
                      icon={RefreshCw}
                      size="sm"
                      isLoading={busyAction === "admin:load"}
                      onClick={() => runAction("load", "admin")}
                    >
                      Refresh
                    </ActionButton>
                  </Flex>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={5}>
                    <VehicleList
                      title="Currently In Lot"
                      visits={activeVehicles}
                      border={border}
                      muted={muted}
                    />
                    <VehicleList
                      title="Full History"
                      visits={historyVehicles}
                      border={border}
                      muted={muted}
                    />
                  </SimpleGrid>
                </PanelCard>
              )}
            </GridItem>

            {/* Response Panel */}
            <GridItem>
              <Box
                bg="gray.950"
                border="1.5px solid"
                borderColor="gray.800"
                borderRadius="xl"
                overflow="hidden"
              >
                <Flex
                  px={5}
                  py={3}
                  borderBottom="1px solid"
                  borderColor="gray.800"
                  align="center"
                  justify="space-between"
                >
                  <HStack spacing={2}>
                    <Box w="8px" h="8px" bg="green.400" borderRadius="full" />
                    <Text fontSize="xs" letterSpacing="0.15em" color="gray.500" fontFamily="'DM Mono', monospace">
                      LIVE RESPONSE
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.600" fontFamily="'DM Mono', monospace">
                    {selectedRole.tag}
                  </Text>
                </Flex>
                <Textarea
                  value={responseText}
                  readOnly
                  minH="360px"
                  fontFamily="'DM Mono', monospace"
                  fontSize="xs"
                  bg="transparent"
                  color="green.300"
                  border="none"
                  resize="vertical"
                  p={5}
                  lineHeight="1.7"
                  _focus={{ boxShadow: "none" }}
                />
              </Box>
            </GridItem>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function PanelCard({ accent, cardBg, border, children }) {
  return (
    <Box
      bg={cardBg}
      border="1.5px solid"
      borderColor={border}
      borderRadius="xl"
      borderTop="3px solid"
      borderTopColor={accent}
      p={{ base: 5, md: 7 }}
    >
      {children}
    </Box>
  );
}

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="xs"
      letterSpacing="0.18em"
      fontWeight="700"
      color="gray.400"
      fontFamily="'DM Mono', monospace"
    >
      {children}
    </Text>
  );
}

function FieldInput({ label, required, ...props }) {
  return (
    <FormControl isRequired={required}>
      <FormLabel
        fontSize="xs"
        letterSpacing="0.1em"
        fontWeight="600"
        color="gray.400"
        fontFamily="'DM Mono', monospace"
        mb={1.5}
      >
        {label}
      </FormLabel>
      <Input
        {...props}
        size="md"
        borderRadius="lg"
        borderColor="gray.200"
        fontFamily="'DM Mono', monospace"
        fontSize="sm"
        _focus={{ borderColor: "gray.400", boxShadow: "none" }}
        _placeholder={{ color: "gray.300" }}
      />
    </FormControl>
  );
}

function ActionButton({ accent, icon, children, variant = "solid", size = "md", ...props }) {
  const isSolid = variant === "solid";
  return (
    <Button
      {...props}
      size={size}
      leftIcon={<Icon as={icon} boxSize={size === "sm" ? 3.5 : 4} />}
      fontFamily="'DM Mono', monospace"
      fontSize="xs"
      letterSpacing="0.08em"
      fontWeight="700"
      borderRadius="lg"
      transition="all 0.15s"
      bg={isSolid ? accent : "transparent"}
      color={isSolid ? "white" : accent}
      border="1.5px solid"
      borderColor={accent}
      _hover={{
        bg: isSolid ? accent : `${accent}15`,
        opacity: isSolid ? 0.88 : 1
      }}
      _active={{ transform: "scale(0.97)" }}
    >
      {children}
    </Button>
  );
}

function VehicleList({ title, visits, border, muted }) {
  return (
    <Box border="1.5px solid" borderColor={border} borderRadius="lg" overflow="hidden">
      <Box px={4} py={3} borderBottom="1px solid" borderColor={border} bg="gray.50">
        <Text fontSize="xs" letterSpacing="0.15em" fontWeight="700" color="gray.500" fontFamily="'DM Mono', monospace">
          {title.toUpperCase()}
        </Text>
      </Box>
      <VStack align="stretch" spacing={0} divider={<Divider borderColor={border} />}>
        {visits.length === 0 ? (
          <Box px={4} py={5}>
            <Text color={muted} fontSize="sm" fontFamily="'DM Mono', monospace">— empty —</Text>
          </Box>
        ) : (
          visits.map((visit) => (
            <Box key={visit.id} px={4} py={3}>
              <Flex justify="space-between" align="center" gap={2}>
                <Box>
                  <Text fontWeight="700" fontSize="sm" fontFamily="'DM Mono', monospace">{visit.vehicleNumber}</Text>
                  <Text color={muted} fontSize="xs" mt={0.5}>{visit.customerName}</Text>
                </Box>
                <StatusBadge status={visit.status} />
              </Flex>
              <Text mt={1.5} color={muted} fontSize="xs" fontFamily="'DM Mono', monospace">
                #{visit.id} · {visit.createdAt || "n/a"}
              </Text>
            </Box>
          ))
        )}
      </VStack>
    </Box>
  );
}

function StatusBadge({ status }) {
  const map = {
    CheckedIn: { color: "#2563eb", label: "IN" },
    Requested: { color: "#7c3aed", label: "REQ" },
    InProgress: { color: "#d97706", label: "PROG" },
    Ready: { color: "#0d9488", label: "READY" },
    CheckedOut: { color: "#16a34a", label: "OUT" }
  };
  const s = map[status] || { color: "#6b7280", label: status };
  return (
    <Box
      px={2}
      py={0.5}
      borderRadius="sm"
      fontSize="10px"
      fontWeight="800"
      letterSpacing="0.12em"
      fontFamily="'DM Mono', monospace"
      bg={`${s.color}18`}
      color={s.color}
      border="1px solid"
      borderColor={`${s.color}40`}
    >
      {s.label}
    </Box>
  );
}