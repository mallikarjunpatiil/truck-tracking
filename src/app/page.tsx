import Link from "next/link";
import { Truck, Shield, Search, Upload, Users, ArrowRight, CheckCircle2, BarChart3, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-navy-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-navy-900 tracking-tight">TRUCK TRACKING</span>
              <span className="font-bold text-blue-600 ml-1">MASTER</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center text-navy-700 text-sm font-semibold hover:text-navy-950 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-colors"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-navy-200">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <Shield className="w-3.5 h-3.5" />
              Enterprise-Grade Security
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-navy-900 leading-tight mb-5">
              Secure Fleet Management
              <br />
              <span className="text-blue-600">for Enterprise</span>
            </h1>
            <p className="text-lg text-navy-500 leading-relaxed mb-8 max-w-lg">
              Manage vehicle records, track customer agreements, and maintain
              comprehensive audit trails with role-based access control.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-navy-900 text-white font-semibold hover:bg-navy-800 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-navy-200 bg-navy-50">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <h2 className="text-2xl font-bold text-navy-900 mb-2">Platform Capabilities</h2>
          <p className="text-navy-500 mb-10">Everything you need to manage your fleet securely.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Search, title: "Vehicle Search", desc: "Search by customer name, registration, chassis, engine, or agreement number" },
              { icon: Upload, title: "Excel Import", desc: "Bulk upload vehicle data with smart column mapping and validation" },
              { icon: Lock, title: "Row-Level Security", desc: "Every database record protected by Supabase RLS policies" },
              { icon: BarChart3, title: "Audit Trail", desc: "Complete logging of every search, view, and administrative action" },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-navy-200 p-6 hover:shadow-enterprise-md hover:border-navy-300 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-navy-900 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-navy-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-navy-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              "Role-Based Access Control",
              "Server-Side Authorization",
              "Encrypted Data Transfer",
              "Complete Audit Logging",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-navy-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-navy-500">
            <Truck className="w-4 h-4" />
            <span>© {new Date().getFullYear()} Truck Tracking Master</span>
          </div>
          <span className="text-xs text-navy-400">Enterprise Fleet Management System</span>
        </div>
      </footer>
    </div>
  );
}
