"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Search, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-navy-200 shadow-enterprise-lg p-8 text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Access Denied</h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold mb-4">
          Admin Privilege Required
        </div>

        <p className="text-navy-600 text-sm leading-relaxed mb-6">
          Your account is registered with <strong className="text-navy-900">User (Read-Only)</strong> permissions.
          You do not have administrative privileges to modify website records, upload files, or view administrative tools.
        </p>

        {/* Security Alert Box */}
        <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 text-left mb-6 text-xs text-navy-500 space-y-1">
          <p className="font-semibold text-navy-800">Security Notice</p>
          <p>
            All unauthorized navigation and modification attempts are automatically logged
            and audited in compliance with enterprise security protocols.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/dashboard" className="block">
            <Button className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-semibold flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Return to User Dashboard
            </Button>
          </Link>

          <Link href="/dashboard/search" className="block">
            <Button variant="outline" className="w-full h-11 border-navy-200 text-navy-700 font-medium flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              Go to Vehicle Search
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
