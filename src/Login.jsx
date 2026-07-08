import { useState } from "react";
import { Box, Button, Flex, FormControl, FormLabel, Input, Text, useToast, VStack, Icon, Link } from "@chakra-ui/react";
import { ParkingCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parkingApi } from "./api/parkingApi";

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
    <Flex minH="100vh" bg="#f0f3f8" align="center" justify="center" p={4}>
      <Box w="full" maxW="400px" bg="white" borderRadius="16px" boxShadow="0 4px 20px rgba(0,0,0,0.05)" p={8}>
        <Flex direction="column" align="center" mb={8}>
          <Flex w="48px" h="48px" borderRadius="12px" bg="linear-gradient(135deg,#2563eb,#6366f1)" align="center" justify="center" mb={4}>
            <Icon as={ParkingCircle} boxSize={6} color="white" />
          </Flex>
          <Text fontSize="24px" fontWeight="800" color="#0f1623">ParkOps</Text>
          <Text fontSize="14px" color="#6b7280" mt={1}>{isLogin ? "Sign in to your account" : "Request access"}</Text>
        </Flex>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="12px" fontWeight="600" color="#4b5568">Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg="#f9fafb"
                border="1px solid #e4e7f0"
                _focus={{ borderColor: "#2563eb", boxShadow: "0 0 0 1px #2563eb" }}
              />
            </FormControl>

            {!isLogin && (
              <FormControl isRequired>
                <FormLabel fontSize="12px" fontWeight="600" color="#4b5568">Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email (for notifications)"
                  bg="#f9fafb"
                  border="1px solid #e4e7f0"
                  _focus={{ borderColor: "#2563eb", boxShadow: "0 0 0 1px #2563eb" }}
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel fontSize="12px" fontWeight="600" color="#4b5568">Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                bg="#f9fafb"
                border="1px solid #e4e7f0"
                _focus={{ borderColor: "#2563eb", boxShadow: "0 0 0 1px #2563eb" }}
              />
            </FormControl>

            <Button
              type="submit"
              w="full"
              h="44px"
              bg="#2563eb"
              color="white"
              _hover={{ bg: "#1d4ed8" }}
              isLoading={loading}
              mt={4}
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </VStack>
        </form>
        
        <Flex justify="center" mt={6}>
          <Link fontSize="14px" color="#2563eb" fontWeight="500" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Link>
        </Flex>
      </Box>
    </Flex>
  );
}
