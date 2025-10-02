"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Kingland</h1>
          <p className="mt-2 text-muted-foreground">Internal Dashboard</p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}
