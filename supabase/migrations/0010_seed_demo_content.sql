-- Lathe — seed the pilot org with the two demo products the kiosk already
-- ships (Cordless Drill + Rolling Tool Chest) so the dashboard opens on
-- populated Products / Media / Hotspots tabs and the pilot kiosk keeps
-- working exactly as before.
--
-- Guarded: only inserts if the pilot org has no products yet. Never touches
-- any other org's data. Safe to re-run.
--
-- The content API's sign() helper passes through `/`-prefixed paths unchanged,
-- so pointing model_url / media.src at the static /models/*.glb and
-- /media/*.mp4 that Vercel already serves from app/public/ keeps the kiosk
-- rendering the same files that shipped with the bundle. No storage upload
-- needed for this seed.

do $$
declare
  v_org  uuid := '11111111-1111-1111-1111-111111111111';
  v_show uuid := '22222222-2222-2222-2222-222222222222';
  v_drill uuid;
  v_chest uuid;
begin
  -- Guard: pilot org already populated? bail.
  if exists (select 1 from products where org_id = v_org) then
    return;
  end if;

  -- ── Cordless Drill ──────────────────────────────────────────────────────
  insert into products (org_id, slug, label, subtitle, tagline, overview, specs, model_url, model_bytes, triangle_count, sort_order)
  values (
    v_org, 'drill-new',
    'Cordless Drill', 'Polished 3D capture',
    'Compact 12V drill/driver built for all-day control.',
    'A lightweight cordless drill/driver sized for cabinets, fixtures, and everyday assembly. A 24-position clutch and variable-speed trigger give you fine control on delicate work, while the keyless chuck and one-hand battery swap keep you moving between tasks.',
    '[
      {"label":"Voltage","value":"12V"},
      {"label":"Chuck","value":"10mm keyless"},
      {"label":"Clutch","value":"24 positions"},
      {"label":"Max torque","value":"30 N·m"},
      {"label":"No-load speed","value":"0–1,500 rpm"},
      {"label":"Weight","value":"1.1 kg"}
    ]'::jsonb,
    '/models/drill-new.glb', 1793065, 28689, 0
  ) returning id into v_drill;

  insert into hotspots (product_id, slug, title, description, position, normal, sort_order) values
    (v_drill, 'chuck', 'Keyless Chuck', 'Swap bits by hand in seconds — no chuck key to lose. Grips down to hex and round shanks alike without slipping under load.',
     '-0.0673 0.1721 0.0271', '-0.1492 -0.2267 0.9625', 0),
    (v_drill, 'clutchRing', '24-Position Clutch', 'Dial in torque per material and screw size. Once the clutch reaches its set resistance it disengages the drive, so screws stop flush instead of stripping or sinking too deep.',
     '-0.0594 0.1872 0.0265', '0.0432 0.1357 0.9898', 1),
    (v_drill, 'trigger', 'Variable-Speed Trigger', 'Squeeze lightly for slow, controlled starts on delicate materials, or all the way for full drilling speed. Speed tracks trigger pressure the whole way through.',
     '-0.0775 0.1388 -0.0019', '-0.6117 -0.7846 -0.1013', 2),
    (v_drill, 'ledLight', 'LED Work Light', 'Switches on with the trigger to light up dim job sites, cabinets, and shelving — no separate switch to remember.',
     '-0.0768 0.1490 0.0141', '-0.7991 -0.2883 0.5276', 3),
    (v_drill, 'batteryPack', 'Compact Li-Ion Battery', 'Slides on and locks with one motion, and is shared across the rest of the tool line, so one charger covers the whole kit.',
     '-0.0337 0.0550 -0.0064', '-0.9126 -0.1461 -0.3817', 4);

  insert into media (product_id, type, src, title, sort_order) values
    (v_drill, 'video', '/media/right-angle-drilling.mp4', 'Right-angle drilling in tight spaces', 0),
    (v_drill, 'video', '/media/install-drill-bit.mp4',    'Installing a drill bit',              1);

  -- ── Rolling Tool Chest ──────────────────────────────────────────────────
  insert into products (org_id, slug, label, subtitle, tagline, overview, specs, model_url, model_bytes, triangle_count, sort_order)
  values (
    v_org, 'tool-chest',
    'Rolling Tool Chest', 'Royalty-free demo model',
    'Roll your whole kit to the job and lock it down.',
    'A mobile workshop chest with full-extension ball-bearing drawers, heavy-duty locking casters, and a single central lock. Built to move a full set of tools around the shop or site and keep them secured between jobs.',
    '[
      {"label":"Drawers","value":"7"},
      {"label":"Load rating","value":"450 kg"},
      {"label":"Casters","value":"2 locking"},
      {"label":"Lock","value":"Central keyed"},
      {"label":"Height","value":"95 cm"},
      {"label":"Material","value":"Powder-coated steel"}
    ]'::jsonb,
    '/models/tool-chest.glb', 1541406, 44000, 1
  ) returning id into v_chest;

  insert into hotspots (product_id, slug, title, description, position, normal, sort_order) values
    (v_chest, 'casters', 'Locking Swivel Casters', 'Heavy-duty casters roll the loaded cart across the shop, then lock solid so it stays put while you work.',
     '-0.7774 0.2000 2.0285', '0.0000 0.9660 0.2587', 0),
    (v_chest, 'handle', 'Side Push Handle', 'A chromed grip on the end gives you a solid hold to steer the loaded cart around benches and through doorways.',
     '0.0934 3.4491 2.4168', '0.0000 0.5556 0.8315', 1),
    (v_chest, 'tub', 'Powder-Coated Steel Tub', 'A single deep welded tub takes knocks, spills, and heavy loads, and wipes clean at the end of the day.',
     '-0.0870 2.0408 2.1469', '0.0000 0.0000 1.0000', 2),
    (v_chest, 'rim', 'Reinforced Top Rim', 'A folded steel rim stiffens the open top and gives a lip to hang panel bags and organizers from.',
     '-0.1701 3.6663 0.3841', '0.0000 1.0000 0.0000', 3);

  -- Attach both products to the pilot show so the kiosk immediately serves
  -- them via /api/content without the user having to open the event editor.
  insert into show_products (show_id, product_id, sort_order) values
    (v_show, v_drill, 0),
    (v_show, v_chest, 1);
end $$;
