"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    secondName: "",
    middleName: "",
    lastName: "",
    birthdate: "",
    contact: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    login: "",
    register: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified successfully! You can now log in.");
    }
  }, [searchParams]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // DEV MODE: Just redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password length
    if (registerData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          firstName: registerData.firstName,
          secondName: registerData.secondName,
          middleName: registerData.middleName,
          lastName: registerData.lastName,
          birthdate: registerData.birthdate,
          contact: registerData.contact,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success("Registration successful! Please check your email to verify your account.");

      // For development: show verification URL
      if (data.verificationUrl) {
        console.log("Verification URL:", data.verificationUrl);
        toast.info("Check console for verification link (dev mode)");
      }

      // Clear form
      setRegisterData({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        secondName: "",
        middleName: "",
        lastName: "",
        birthdate: "",
        contact: "",
      });
    } catch {
      toast.error("An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-lg border shadow-lg p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome</h1>
            <p className="text-muted-foreground">Sign in to your account or create a new one</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Field
                  label="Email"
                  type="text"
                  value={loginData.email}
                  onChange={(value) => setLoginData({ ...loginData, email: value })}
                  disabled={isLoading}
                  placeholder="Enter your email"
                />

                <Field
                  label="Password"
                  type="password"
                  value={loginData.password}
                  onChange={(value) => {
                    setLoginData({ ...loginData, password: value });
                    setPasswordErrors({ ...passwordErrors, login: "" });
                  }}
                  onBlur={() => {
                    if (loginData.password && loginData.password.length < 6) {
                      setPasswordErrors({ ...passwordErrors, login: "Password must be at least 6 characters" });
                    }
                  }}
                  disabled={isLoading}
                  placeholder="Enter your password"
                  error={passwordErrors.login}
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
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="First Name"
                    type="text"
                    value={registerData.firstName}
                    onChange={(value) => setRegisterData({ ...registerData, firstName: value })}
                    disabled={isLoading}
                    placeholder="First name"
                  />

                  <Field
                    label="Second Name"
                    type="text"
                    value={registerData.secondName}
                    onChange={(value) => setRegisterData({ ...registerData, secondName: value })}
                    disabled={isLoading}
                    placeholder="Second name (optional)"
                  />

                  <Field
                    label="Middle Name"
                    type="text"
                    value={registerData.middleName}
                    onChange={(value) => setRegisterData({ ...registerData, middleName: value })}
                    disabled={isLoading}
                    placeholder="Middle name (optional)"
                  />

                  <Field
                    label="Last Name"
                    type="text"
                    value={registerData.lastName}
                    onChange={(value) => setRegisterData({ ...registerData, lastName: value })}
                    disabled={isLoading}
                    placeholder="Last name"
                  />
                </div>

                <Field
                  label="Email"
                  type="text"
                  value={registerData.email}
                  onChange={(value) => setRegisterData({ ...registerData, email: value })}
                  disabled={isLoading}
                  placeholder="Enter your email"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Password"
                    type="password"
                    value={registerData.password}
                    onChange={(value) => {
                      setRegisterData({ ...registerData, password: value });
                      setPasswordErrors({ ...passwordErrors, register: "" });
                    }}
                    onBlur={() => {
                      if (registerData.password.length < 6) {
                        setPasswordErrors({ ...passwordErrors, register: "Password must be at least 6 characters" });
                      }
                    }}
                    disabled={isLoading}
                    placeholder="At least 6 characters"
                    error={passwordErrors.register}
                  />

                  <Field
                    label="Confirm Password"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(value) => {
                      setRegisterData({ ...registerData, confirmPassword: value });
                      setPasswordErrors({ ...passwordErrors, confirmPassword: "" });
                    }}
                    onBlur={() => {
                      if (registerData.confirmPassword && registerData.confirmPassword !== registerData.password) {
                        setPasswordErrors({ ...passwordErrors, confirmPassword: "Passwords do not match" });
                      }
                    }}
                    disabled={isLoading}
                    placeholder="Confirm password"
                    error={passwordErrors.confirmPassword}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Birthdate"
                    type="date"
                    value={registerData.birthdate ? new Date(registerData.birthdate) : undefined}
                    onChange={(date) => setRegisterData({ ...registerData, birthdate: date ? date.toISOString().split('T')[0] : '' })}
                    disabled={isLoading}
                    captionLayout="dropdown"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />

                  <Field
                    label="Contact Number"
                    type="text"
                    value={registerData.contact}
                    onChange={(value) => setRegisterData({ ...registerData, contact: value })}
                    disabled={isLoading}
                    placeholder="Contact number"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
