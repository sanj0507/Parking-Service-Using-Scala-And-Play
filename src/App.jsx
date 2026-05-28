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
  Kbd,
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
  BadgeCheck
} from "lucide-react";
import { useMemo, useState } from "react";
import { parkingApi } from "./api/parkingApi.js";

const roleCards = [
  {
    key: "user",
    title: "User",
    icon: UserRoundCheck,
    color: "blue",
    description: "Can bring a vehicle to lot and request check-in or check-out.",
    permissions: ["Create Check-In", "Request Check-Out"]
  },
  {
    key: "valet",
    title: "Valet",
    icon: KeyRound,
    color: "teal",
    description: "Accepts customer requests and marks vehicles ready for check-out.",
    permissions: ["Acknowledge", "Ready"]
  },
  {
    key: "admin",
    title: "Admin",
    icon: ShieldCheck,
    color: "orange",
    description: "Sees active checked-in vehicles and full vehicle entry/exit history.",
    permissions: ["Current Checked-In List", "Entered & Exited History"]
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
  title: "Live response",
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

  const selectedRole = roleCards.find((role) => role.key === activeRole) || roleCards[0];
  const activeVehicles = visits.filter((visit) => visit.status !== "CheckedOut");
  const historyVehicles = visits;
  const pageBg = useColorModeValue("#f3efe8", "gray.950");
  const panelBg = useColorModeValue("white", "gray.900");
  const softPanelBg = useColorModeValue("#fffaf2", "gray.800");
  const mutedText = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("blackAlpha.100", "whiteAlpha.200");

  const responseText = useMemo(() => {
    if (!response.body) return response.detail;
    return JSON.stringify(response.body, null, 2);
  }, [response]);

  async function runAction(action, role = activeRole) {
    setBusyAction(`${role}:${action}`);
    try {
      const result = await dispatchAction(action, role);
      setResponse({ title: actionLabels[action] || "Success", detail: "Request completed successfully.", body: result });
      toast({ title: "Action completed", description: actionLabels[action], status: "success", duration: 2200, isClosable: true });
    } catch (error) {
      setResponse({ title: actionLabels[action] || "Request failed", detail: error.message, body: { error: error.message } });
      toast({ title: "Request failed", description: error.message, status: "error", duration: 3200, isClosable: true });
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
      case "acknowledge":
        return parkingApi.acknowledge(role, visitId);
      case "ready":
        return parkingApi.markReady(role, visitId);
      case "request":
        return parkingApi.requestCheckout(role, visitId);
      case "checkout":
        return parkingApi.checkOut(role, visitId);
      case "load": {
        const result = await parkingApi.loadVisits();
        setVisits(result.body?.data || []);
        return result;
      }
      default:
        throw new Error("Unknown action");
    }
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Box bg="linear-gradient(140deg, #0f172a, #1d4d57)" color="white">
        <Container maxW="7xl" py={{ base: 8, md: 10 }}>
          <Heading size={{ base: "xl", md: "2xl" }}>Parking Operations Dashboard</Heading>
          <Text mt={2} color="whiteAlpha.800">
            Clean role-based controls: user requests check-in/check-out, valet handles acceptance/ready, admin monitors all vehicles.
          </Text>
        </Container>
      </Box>

      <Container maxW="7xl" mt={6} pb={12}>
        <Stack spacing={6}>
          <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="2xl" boxShadow="xl" p={{ base: 4, md: 6 }}>
            <Flex wrap="wrap" gap={3}>
              {roleCards.map((role) => (
                <Button
                  key={role.key}
                  onClick={() => setActiveRole(role.key)}
                  leftIcon={<Icon as={role.icon} />}
                  colorScheme={activeRole === role.key ? role.color : "gray"}
                  variant={activeRole === role.key ? "solid" : "outline"}
                >
                  {role.title}
                </Button>
              ))}
            </Flex>

            <Box mt={4} bg={softPanelBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" p={4}>
              <HStack spacing={3} align="start">
                <Icon as={selectedRole.icon} boxSize={5} color={`${selectedRole.color}.500`} mt={1} />
                <Box>
                  <Heading size="sm">{selectedRole.title}</Heading>
                  <Text color={mutedText} fontSize="sm" mt={1}>{selectedRole.description}</Text>
                  <HStack spacing={2} mt={3} flexWrap="wrap">
                    {selectedRole.permissions.map((permission) => (
                      <Kbd key={permission}>{permission}</Kbd>
                    ))}
                  </HStack>
                </Box>
              </HStack>
            </Box>
          </Box>

          <Grid templateColumns={{ base: "1fr", xl: "1.2fr 0.8fr" }} gap={6} alignItems="start">
            <GridItem>
              <Stack spacing={6}>
                {activeRole === "user" && (
                  <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="2xl" boxShadow="xl" p={{ base: 4, md: 6 }}>
                    <Heading size="md">User Actions</Heading>
                    <Text color={mutedText} mt={1}>Bring vehicle to lot and request check-in/check-out only.</Text>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                      <FormControl isRequired>
                        <FormLabel>Vehicle number</FormLabel>
                        <Input value={form.vehicleNumber} onChange={(event) => setForm({ ...form, vehicleNumber: event.target.value })} placeholder="TN01AB1234" />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Customer name</FormLabel>
                        <Input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="John" />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Mobile number</FormLabel>
                        <Input value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value })} placeholder="9876543210" />
                      </FormControl>
                    </SimpleGrid>
                    <Button mt={4} leftIcon={<Icon as={CarFront} />} colorScheme="blue" isLoading={busyAction === "user:create"} onClick={() => runAction("create", "user")}>
                      Request Check-In
                    </Button>

                    <Divider my={5} />

                    <FormControl isRequired>
                      <FormLabel>Visit ID</FormLabel>
                      <Input value={visitId} onChange={(event) => setVisitId(event.target.value)} type="number" min="1" placeholder="101" />
                    </FormControl>
                    <Button mt={4} leftIcon={<Icon as={BellRing} />} variant="outline" colorScheme="blue" isLoading={busyAction === "user:request"} onClick={() => runAction("request", "user")}>
                      Request Check-Out
                    </Button>
                  </Box>
                )}

                {activeRole === "valet" && (
                  <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="2xl" boxShadow="xl" p={{ base: 4, md: 6 }}>
                    <Heading size="md">Valet Actions</Heading>
                    <Text color={mutedText} mt={1}>Accept request and make vehicle ready for check-out.</Text>
                    <FormControl isRequired mt={4}>
                      <FormLabel>Visit ID</FormLabel>
                      <Input value={visitId} onChange={(event) => setVisitId(event.target.value)} type="number" min="1" placeholder="101" />
                    </FormControl>
                    <HStack mt={4} spacing={3} flexWrap="wrap">
                      <Button leftIcon={<Icon as={BadgeCheck} />} colorScheme="teal" isLoading={busyAction === "valet:acknowledge"} onClick={() => runAction("acknowledge", "valet")}>
                        Acknowledge
                      </Button>
                      <Button leftIcon={<Icon as={CheckCircle2} />} variant="outline" colorScheme="teal" isLoading={busyAction === "valet:ready"} onClick={() => runAction("ready", "valet")}>
                        Mark Ready
                      </Button>
                      <Button leftIcon={<Icon as={CarFront} />} variant="outline" colorScheme="blue" isLoading={busyAction === "valet:checkout"} onClick={() => runAction("checkout", "valet")}>
                        Accept Checkout
                      </Button>
                    </HStack>
                  </Box>
                )}

                {activeRole === "admin" && (
                  <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="2xl" boxShadow="xl" p={{ base: 4, md: 6 }}>
                    <Flex justify="space-between" align="center" gap={3}>
                      <Box>
                        <Heading size="md">Admin Monitoring</Heading>
                        <Text color={mutedText} mt={1}>List of current checked-in vehicles and all entered/exited vehicles.</Text>
                      </Box>
                      <Button size="sm" leftIcon={<Icon as={ClipboardList} />} colorScheme="orange" isLoading={busyAction === "admin:load"} onClick={() => runAction("load", "admin")}>
                        Refresh
                      </Button>
                    </Flex>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={5}>
                      <ListPanel
                        title="Current Checked-In Vehicles"
                        subtitle="Vehicles currently in lot"
                        visits={activeVehicles}
                        borderColor={borderColor}
                        mutedText={mutedText}
                      />
                      <ListPanel
                        title="Entered & Exited History"
                        subtitle="Complete visit history"
                        visits={historyVehicles}
                        borderColor={borderColor}
                        mutedText={mutedText}
                      />
                    </SimpleGrid>
                  </Box>
                )}
              </Stack>
            </GridItem>

            <GridItem>
              <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="2xl" boxShadow="xl" p={6}>
                <Flex justify="space-between" align="start" gap={3} mb={4}>
                  <Box>
                    <Heading size="md">Live response</Heading>
                    <Text color={mutedText} fontSize="sm">API payload and status for the current role action.</Text>
                  </Box>
                  <Kbd>API</Kbd>
                </Flex>
                <Textarea value={responseText} readOnly minH="300px" fontFamily="mono" fontSize="sm" bg="gray.950" color="green.100" borderColor="transparent" resize="vertical" />
              </Box>
            </GridItem>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}

function ListPanel({ title, subtitle, visits, borderColor, mutedText }) {
  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="xl" p={4}>
      <Heading size="sm">{title}</Heading>
      <Text color={mutedText} fontSize="sm" mt={1}>{subtitle}</Text>
      <VStack align="stretch" spacing={3} mt={4}>
        {visits.length === 0 ? (
          <Text color={mutedText}>No vehicles in this list.</Text>
        ) : (
          visits.map((visit) => (
            <Box key={visit.id} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={3}>
              <Flex justify="space-between" align="start" gap={2}>
                <Box>
                  <Text fontWeight="700">{visit.vehicleNumber}</Text>
                  <Text color={mutedText} fontSize="sm">{visit.customerName}</Text>
                </Box>
                <Badge colorScheme={statusColor(visit.status)}>{visit.status}</Badge>
              </Flex>
              <Text mt={2} color={mutedText} fontSize="sm">Visit #{visit.id}</Text>
              <Text color={mutedText} fontSize="sm">Entry: {visit.createdAt || "n/a"}</Text>
            </Box>
          ))
        )}
      </VStack>
    </Box>
  );
}

function statusColor(status) {
  switch (status) {
    case "CheckedIn":
      return "blue";
    case "Requested":
      return "purple";
    case "InProgress":
      return "orange";
    case "Ready":
      return "teal";
    case "CheckedOut":
      return "green";
    default:
      return "gray";
  }
}
