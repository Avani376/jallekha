"use client";

/**
 * First-run onboarding for the real-data workspace: one screen that creates
 * the site, tank and meter. Records can then be imported (CSV) or entered
 * manually. Nothing synthetic is created here.
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { IconArrowRight, IconDroplet } from "@/components/icons";
import { toLiters, QuantityError } from "@/domain/units";
import { mascotReact } from "./mascot";

export function RealOnboarding() {
  const { actions } = useWorkspace();
  const [f, setF] = useState({ site: "", location: "", tank: "", capacity: "20000", meter: "", boundary: "", note: "" });
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = () => {
    try {
      if (!f.site.trim()) throw new Error("Give the site a name (e.g. the building or society).");
      if (!f.tank.trim()) throw new Error("Name the tank being tracked.");
      const capacity = Number(f.capacity);
      if (Number.isNaN(capacity) || !Number.isFinite(capacity) || capacity <= 0) throw new Error("Tank capacity must be a positive number.");
      toLiters(capacity, "L", "capacity");
      if (!f.meter.trim()) throw new Error("Name the outflow meter.");
      if (!f.boundary.trim()) throw new Error("Describe which outflows the meter covers — the balance assumes this boundary.");

      const actor = "onboarding";
      const siteId = actions.addSite({
        name: f.site.trim(),
        timezone: "Asia/Kolkata",
        description: f.location.trim() ? `Location: ${f.location.trim()}` : "",
        actor,
      });
      const tankId = actions.addTank({
        siteId,
        name: f.tank.trim(),
        capacityLiters: capacity,
        note: f.note.trim(),
        actor,
      });
      actions.addMeter({ siteId, name: f.meter.trim(), boundary: f.boundary.trim(), actor });
      actions.setPeriod(
        siteId,
        new Date(Date.now() - 24 * 3600_000).toISOString(),
        new Date().toISOString(),
        actor,
      );
      setDone(true);
      mascotReact("wave", 3200);
      setF({ site: "", location: "", tank: "", capacity: "20000", meter: "", boundary: "", note: "" });
      setErr(null);
      void tankId;
    } catch (e) {
      setErr(e instanceof QuantityError || e instanceof Error ? e.message : "Could not create the workspace.");
    }
  };

  if (done) return null; // provider switches to the created site automatically

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <IconDroplet />
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">Set up your water workspace</h1>
            <p className="text-[13px] text-slate-500">
              Your records stay in this browser. Next: import deliveries and readings from CSV (Reports has JSON backup too).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Site name" htmlFor="ob-site" required hint="Campus, building or society">
              <Input id="ob-site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} placeholder="Sunrise Residency" />
            </Field>
            <Field label="Location (optional)" htmlFor="ob-loc">
              <Input id="ob-loc" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Pune, MH" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tank name" htmlFor="ob-tank" required>
              <Input id="ob-tank" value={f.tank} onChange={(e) => setF({ ...f, tank: e.target.value })} placeholder="T-01 Overhead Tank" />
            </Field>
            <Field label="Tank capacity (L)" htmlFor="ob-cap" required>
              <Input id="ob-cap" type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Meter name" htmlFor="ob-meter" required>
              <Input id="ob-meter" value={f.meter} onChange={(e) => setF({ ...f, meter: e.target.value })} placeholder="M-01 Main Outflow" />
            </Field>
            <Field label="What does the meter cover?" htmlFor="ob-bound" required hint="The balance assumes this boundary covers all outflow">
              <Input id="ob-bound" value={f.boundary} onChange={(e) => setF({ ...f, boundary: e.target.value })} placeholder="Kitchen + wash lines from T-01" />
            </Field>
          </div>
          <Field label="How are readings taken? (optional)" htmlFor="ob-note" hint="Stored with the tank for measurement context">
            <Textarea id="ob-note" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Dipstick calibrated in cm; readings each morning 08:00" />
          </Field>
          {err ? <p role="alert" className="text-[13px] font-semibold text-danger">{err}</p> : null}
          <div className="flex justify-end">
            <Button onClick={submit}>Create workspace <IconArrowRight /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
