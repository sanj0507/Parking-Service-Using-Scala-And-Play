import { useState } from "react";
import { Box, Button, Flex, FormControl, FormLabel, Input, Text, useToast, VStack, Icon, Link } from "@chakra-ui/react";
import { ParkingCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parkingApi } from "./api/parkingApi";
import { C } from "./theme/palette.js";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const data = await parkingApi.login(username, password);
        localStorage.setItem("token", data.token);
        
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        const role = payload.role;

        if (role === "Admin") navigate("/admin");
        else if (role === "Valet") navigate("/valet");
        else navigate("/advisor");

        toast({
          title: "Welcome back!",
          status: "success",
          duration: 2000,
          position: "bottom-right"
        });
      } else {
        const data = await parkingApi.signup(username, email, password);
        toast({
          title: "Success",
          description: data.message || "Your request has been sent to admin.",
          status: "success",
          duration: 5000,
          position: "bottom-right"
        });
        setIsLogin(true); // Switch back to login
        setUsername("");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
        duration: 3000,
        position: "bottom-right"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4}>
      <Box w="full" maxW="400px" bg={C.surface} borderRadius="2xl" boxShadow="0 4px 16px rgba(0,0,0,0.06)" p={10}>
        <Flex direction="column" align="center" mb={10}>
          <Flex w="48px" h="48px" borderRadius="12px" bg={`linear-gradient(135deg, ${C.blue}, ${C.indigo})`} align="center" justify="center" mb={4}>
            <Icon as={ParkingCircle} boxSize={6} color="white" />
          </Flex>
          <Text fontSize="24px" fontWeight="800" color={C.text}>ParkOps</Text>
          <Text fontSize="14px" color={C.muted} mt={1}>{isLogin ? "Sign in to your account" : "Request access"}</Text>
        </Flex>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="12px" fontWeight="600" color={C.sub}>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg={C.faint}
                border={`1px solid ${C.border}`}
                _focus={{ borderColor: C.blue, boxShadow: `0 0 0 1px ${C.blue}` }}
              />
            </FormControl>

            {!isLogin && (
              <FormControl isRequired>
                <FormLabel fontSize="12px" fontWeight="600" color={C.sub}>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email (for notifications)"
                  bg={C.faint}
                  border={`1px solid ${C.border}`}
                  _focus={{ borderColor: C.blue, boxShadow: `0 0 0 1px ${C.blue}` }}
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel fontSize="12px" fontWeight="600" color={C.sub}>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                bg={C.faint}
                border={`1px solid ${C.border}`}
                _focus={{ borderColor: C.blue, boxShadow: `0 0 0 1px ${C.blue}` }}
              />
            </FormControl>

            <Button
              type="submit"
              w="full"
              h="44px"
              bg={C.blue}
              color="white"
              _hover={{ bg: C.blueHover }}
              isLoading={loading}
              mt={4}
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </VStack>
        </form>

        <Flex justify="center" mt={6}>
          <Link fontSize="14px" color={C.blue} fontWeight="500" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Link>
        </Flex>
      </Box>
    </Flex>
  );
}
