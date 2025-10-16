"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [passwordError, setPasswordError] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (loginData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Sign in error:", result.error);
        toast.error("Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        toast.success("Login successful!");
        // Use window.location for a full page reload to ensure session is loaded
        window.location.href = "/dashboard";
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border shadow-lg p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Field
              label="Email"
              type="text"
              value={loginData.email}
              onChange={(value) => setLoginData({ ...loginData, email: value })}
              disabled={isLoading}
              placeholder="Enter your email"
              required
            />

            <Field
              label="Password"
              type="password"
              value={loginData.password}
              onChange={(value) => {
                setLoginData({ ...loginData, password: value });
                setPasswordError("");
              }}
              onBlur={() => {
                if (loginData.password && loginData.password.length < 6) {
                  setPasswordError("Password must be at least 6 characters");
                }
              }}
              disabled={isLoading}
              placeholder="Enter your password"
              error={passwordError}
              required
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
