import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ConditionalLayout } from "@/components/ConditionalLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Superwork - Customer Portal",
  description: "Manage your Superwork account, projects, and assets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </AuthProvider>
        {/* Start of HubSpot Embed Code */}
        <Script
          id="hs-script-loader"
          strategy="lazyOnload"
          src="https://js.hs-scripts.com/506440.js"
        />
        {/* End of HubSpot Embed Code */}
      </body>
    </html>
  );
}
