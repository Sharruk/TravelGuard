import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, User, Badge } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (role: "tourist" | "police") => {
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      
      const data = await response.json();
      
      if (data.user.role !== role) {
        toast({
          title: "Error",
          description: `This account is not registered as a ${role}`,
          variant: "destructive",
        });
        return;
      }

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.tourist) {
        localStorage.setItem("tourist", JSON.stringify(data.tourist));
      }

      // Navigate to appropriate dashboard
      setLocation(role === "tourist" ? "/tourist" : "/police");
      
      toast({
        title: "Success",
        description: `Logged in as ${data.user.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: "tourist" | "police") => {
    const demoCredentials = {
      tourist: { username: "priya.sharma", password: "password123" },
      police: { username: "raj.desai", password: "password123" }
    };
    
    setUsername(demoCredentials[role].username);
    setPassword(demoCredentials[role].password);
    
    setTimeout(() => handleLogin(role), 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-600 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SafeTourism</h1>
            <p className="text-muted-foreground mt-2">Tourist Safety Management System</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                data-testid="input-username"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                data-testid="input-password"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => handleLogin("tourist")} 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-tourist-login"
              >
                <User className="h-4 w-4 mr-2" />
                Tourist Login
              </Button>
              <Button 
                onClick={() => handleLogin("police")} 
                disabled={isLoading}
                variant="secondary"
                className="flex-1"
                data-testid="button-police-login"
              >
                <Badge className="h-4 w-4 mr-2" />
                Police Login
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">Demo Mode</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => handleDemoLogin("tourist")}
                variant="outline"
                className="flex-1"
                data-testid="button-tourist-demo"
              >
                Tourist Demo
              </Button>
              <Button 
                onClick={() => handleDemoLogin("police")}
                variant="outline"
                className="flex-1"
                data-testid="button-police-demo"
              >
                Police Demo
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground text-center">
              <p>Tourist Demo: Full mobile experience with safety features</p>
              <p>Police Demo: Dashboard with real-time monitoring</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
