import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Flex, Spinner, Text, VStack, useToast, Icon, Heading, Divider } from "@chakra-ui/react";
import { CheckCircle2, CreditCard, Receipt, Clock, Info } from "lucide-react";
import { parkingApi } from "./api/parkingApi.js";
import { C } from "./theme/palette.js";

export default function Checkout() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [billData, setBillData] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestingCheckout, setRequestingCheckout] = useState(false);

  useEffect(() => {
    fetchBill();
  }, [visitId]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/visits/${visitId}/bill`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(JSON.parse(text).error || "Failed to fetch bill");
      }
      const data = await res.json();
      setBillData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCheckout = async () => {
    try {
      setRequestingCheckout(true);
      const res = await fetch(`/api/visits/${visitId}/request-checkout`, {
        method: "POST"
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(JSON.parse(text).error || "Failed to request checkout");
      }
      toast({ title: "Checkout Requested", description: "Valet has been notified.", status: "success", duration: 3000 });
      fetchBill();
    } catch (err) {
      toast({ title: "Failed", description: err.message, status: "error", duration: 3000 });
    } finally {
      setRequestingCheckout(false);
    }
  };

  const handlePayment = async () => {
    if (!billData) return;
    try {
      setPaying(true);
      const res = await fetch(`/api/webhook/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: parseInt(visitId) })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(JSON.parse(text).error || "Payment failed");
      }
      setSuccess(true);
      toast({ title: "Payment Successful", description: "Your vehicle has been checked out.", status: "success", duration: 5000 });
    } catch (err) {
      toast({ title: "Payment Failed", description: err.message, status: "error", duration: 3000 });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4}>
        <Spinner size="xl" color={C.blue} thickness="4px" />
      </Flex>
    );
  }

  if (success || billData?.status === "CheckedOut") {
    return (
      <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4}>
        <Box bg={C.surface} p={8} borderRadius="2xl" boxShadow="sm" maxW="400px" w="full" textAlign="center" border={`1px solid ${C.border}`}>
          <Icon as={CheckCircle2} boxSize={16} color={C.green} mb={4} />
          <Heading size="lg" color={C.text} mb={2}>You're All Set!</Heading>
          <Text color={C.muted} fontSize="md" mb={6}>Your vehicle is checked out. Thank you for using ParkOps!</Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4}>
      <Box bg={C.surface} p={8} borderRadius="2xl" boxShadow="0 4px 16px rgba(0,0,0,0.06)" maxW="400px" w="full" border={`1px solid ${C.border}`}>
        <Flex align="center" gap={3} mb={8}>
          <Flex w="40px" h="40px" borderRadius="10px" bg={`${C.blue}15`} align="center" justify="center">
            <Icon as={Receipt} color={C.blue} boxSize={5} />
          </Flex>
          <Box>
            <Heading size="md" color={C.text}>Checkout</Heading>
            <Text fontSize="13px" color={C.muted}>Visit #{visitId}</Text>
          </Box>
        </Flex>

        {error ? (
          <VStack spacing={4} align="stretch">
            <Box p={4} bg={`${C.amber}10`} border={`1px solid ${C.amber}40`} borderRadius="xl">
              <Flex align="start" gap={3}>
                <Icon as={Info} color={C.amber} mt={0.5} />
                <Box>
                  <Text fontSize="14px" fontWeight="600" color={C.text}>Cannot Generate Bill</Text>
                  <Text fontSize="13px" color={C.muted} mt={1}>{error}</Text>
                </Box>
              </Flex>
            </Box>
          </VStack>
        ) : billData ? (
          <VStack spacing={5} align="stretch">
            <Box bg={C.bg} p={4} borderRadius="xl" border={`1px solid ${C.border}`}>
              <Flex justify="space-between" mb={3}>
                <Text fontSize="13px" color={C.muted} display="flex" alignItems="center" gap={2}>
                  <Icon as={Clock} boxSize={3.5} /> Duration
                </Text>
                <Text fontSize="13px" fontWeight="600">{billData.durationHours?.toFixed(1)} hrs</Text>
              </Flex>
              <Flex justify="space-between" mb={3}>
                <Text fontSize="13px" color={C.muted}>Rate</Text>
                <Text fontSize="13px" fontWeight="600">₹{billData.baseRate?.toFixed(2)}/hr</Text>
              </Flex>
              {billData.surgeMultiplier > 1 && (
                <Flex justify="space-between" mb={3}>
                  <Text fontSize="13px" color={C.amber}>Peak Surge</Text>
                  <Text fontSize="13px" fontWeight="600" color={C.amber}>{billData.surgeMultiplier}x</Text>
                </Flex>
              )}
              <Divider my={3} borderColor={C.border} />
              <Flex justify="space-between" align="center">
                <Text fontSize="15px" fontWeight="700" color={C.text}>Total Due</Text>
                <Text fontSize="24px" fontWeight="800" color={C.blue}>₹{billData.totalFee?.toFixed(2)}</Text>
              </Flex>
            </Box>

            {billData?.status === "AwaitingPayment" ? (
              <VStack spacing={3} align="stretch">
                <Button
                  w="full"
                  size="lg"
                  colorScheme="blue"
                  bg={C.blue}
                  _hover={{ bg: C.blueHover }}
                  isLoading={paying}
                  onClick={handlePayment}
                  leftIcon={<CreditCard size={18} />}
                >
                  Pay ₹{billData.totalFee?.toFixed(2)}
                </Button>
                <Text fontSize="12px" color={C.muted} textAlign="center">Secure payment via Stripe</Text>
              </VStack>
            ) : billData?.status === "RequestedCheckout" ? (
              <VStack spacing={3} align="stretch">
                <Text fontSize="14px" fontWeight="600" color={C.amber} textAlign="center">
                  Waiting for Valet
                </Text>
                <Text fontSize="12px" color={C.muted} textAlign="center">
                  The valet has been notified and is preparing your vehicle. Your bill will appear here once ready.
                </Text>
              </VStack>
            ) : billData?.status === "Ready" ? (
              <VStack spacing={3} align="stretch">
                <Button w="full" size="lg" colorScheme="blue" variant="outline" isLoading={requestingCheckout} onClick={handleRequestCheckout}>
                  Request Checkout
                </Button>
                <Text fontSize="12px" color={C.muted} textAlign="center">
                  Your vehicle is ready! Click to request checkout and we'll prepare it for you.
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                <Text fontSize="14px" fontWeight="600" color={C.amber} textAlign="center">
                  Your vehicle is not ready for checkout yet.
                </Text>
                <Text fontSize="12px" color={C.muted} textAlign="center">
                  Please wait until your vehicle is processed before completing payment.
                </Text>
              </VStack>
            )}
          </VStack>
        ) : null}
      </Box>
    </Flex>
  );
}
