import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { AccountClient } from "@/components/public/AccountClient";

export const metadata: Metadata = {
  title: "حسابي",
  description: "إدارة حسابك، العناوين، ونقاط الولاء في روز باريس لمواد البناء والديكور",
};

export default async function AccountPage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <main className="flex-1">
        <AccountClient isLoggedIn={Boolean(session?.user?.id)} />
      </main>
      <Footer />
    </div>
  );
}

