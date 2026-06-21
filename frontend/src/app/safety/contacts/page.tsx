"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Loader2, Phone, Mail, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const val = data.find((s: any) => s.key === "incident_emergency_contacts")?.value;
      if (val) {
        try {
          setContacts(JSON.parse(val));
        } catch (e) {}
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Phone className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Kontak Darurat</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Jika Anda berada dalam kondisi darurat atau membutuhkan bantuan segera terkait insiden, silakan hubungi salah satu kontak di bawah ini.
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 text-slate-500">
          Belum ada kontak darurat yang tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((contact, idx) => (
            <Card key={idx} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
              <div className="h-2 w-full bg-red-500"></div>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{contact.name}</h3>
                <p className="text-sm font-medium text-red-600 mb-4 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> {contact.role}
                </p>
                
                <div className="space-y-3 mt-6">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-red-50 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{contact.phone}</span>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-red-50 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span>{contact.email}</span>
                    </a>
                  )}
                  {contact.link && (
                    <a href={contact.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-red-50 flex items-center justify-center">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-[200px]">{contact.link.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
