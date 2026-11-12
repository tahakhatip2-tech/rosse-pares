import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { OrdersClient } from "@/components/public/OrdersClient";

export const metadata: Metadata = {
  title: "طلباتي",
  description: "متابعة طلبياتك من روز باريس لمواد البناء والديكور وإعادة الطلب بسهولة",
};

export default async function OrdersPage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <main className="flex-1">
        <OrdersClient isLoggedIn={Boolean(session?.user?.id)} />
      </main>
      <Footer />
    </div>
  );
}

