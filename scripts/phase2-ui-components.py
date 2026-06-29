#!/usr/bin/env python3
"""
Batch-commit shadcn/ui primitives — one commit per component.
Each commit adds the component file and a meaningful message.
"""
import os
import subprocess
import shutil
from pathlib import Path

SRC = Path("/tmp/aria-backup/src/components/ui")
DST = Path("/home/z/my-project/src/components/ui")
DST.mkdir(parents=True, exist_ok=True)

# Map component file → human description for commit message
COMPONENTS = {
    "button.tsx": "button with size and variant CVA patterns",
    "input.tsx": "input with focus ring and disabled states",
    "label.tsx": "label using Radix primitive",
    "card.tsx": "card with header, content, footer subcomponents",
    "badge.tsx": "badge with variant CVA (default, secondary, destructive, outline)",
    "alert.tsx": "alert with variant CVA (default, destructive)",
    "alert-dialog.tsx": "alert-dialog using Radix primitive",
    "dialog.tsx": "dialog using Radix primitive",
    "sheet.tsx": "sheet (side-panel dialog) using Radix",
    "drawer.tsx": "drawer using vaul (mobile-friendly bottom sheet)",
    "dropdown-menu.tsx": "dropdown-menu using Radix",
    "select.tsx": "select using Radix",
    "checkbox.tsx": "checkbox using Radix",
    "radio-group.tsx": "radio-group using Radix",
    "switch.tsx": "switch using Radix",
    "slider.tsx": "slider using Radix",
    "toggle.tsx": "toggle using Radix",
    "toggle-group.tsx": "toggle-group using Radix",
    "tabs.tsx": "tabs using Radix",
    "accordion.tsx": "accordion using Radix",
    "collapsible.tsx": "collapsible using Radix",
    "scroll-area.tsx": "scroll-area using Radix",
    "separator.tsx": "separator using Radix",
    "progress.tsx": "progress using Radix",
    "skeleton.tsx": "skeleton loading placeholder",
    "tooltip.tsx": "tooltip using Radix",
    "popover.tsx": "popover using Radix",
    "hover-card.tsx": "hover-card using Radix",
    "avatar.tsx": "avatar with image and fallback using Radix",
    "calendar.tsx": "calendar using react-day-picker",
    "command.tsx": "command palette using cmdk",
    "context-menu.tsx": "context-menu using Radix",
    "menubar.tsx": "menubar using Radix",
    "navigation-menu.tsx": "navigation-menu using Radix",
    "breadcrumb.tsx": "breadcrumb with link and list",
    "pagination.tsx": "pagination with previous/next buttons",
    "table.tsx": "table with header, body, row, cell",
    "form.tsx": "form components integrating react-hook-form",
    "textarea.tsx": "textarea with focus ring",
    "input-otp.tsx": "OTP input using input-otp library",
    "aspect-ratio.tsx": "aspect-ratio container using Radix",
    "resizable.tsx": "resizable panels using react-resizable-panels",
    "carousel.tsx": "carousel using embla-carousel-react",
    "chart.tsx": "chart container helpers for Recharts integration",
    "toast.tsx": "toast component using Radix toast",
    "toaster.tsx": "toaster that renders queued toasts",
    "sonner.tsx": "sonner toaster integration",
    "sidebar.tsx": "sidebar primitive composable with provider and triggers",
}

os.chdir("/home/z/my-project")

count = 0
for filename, desc in COMPONENTS.items():
    src_file = SRC / filename
    dst_file = DST / filename
    if not src_file.exists():
        print(f"SKIP (missing source): {filename}")
        continue
    shutil.copy(src_file, dst_file)
    subprocess.run(["git", "add", str(dst_file)], check=True)
    msg = f"feat(ui): add {filename.removesuffix('.tsx')} component\n\n- {desc}\n- New York style shadcn/ui primitive\n- Radix UI where applicable"
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)
    count += 1
    if count % 10 == 0:
        print(f"  ... {count} components committed")

print(f"\nTotal UI component commits: {count}")

# Verify
result = subprocess.run(["git", "log", "--oneline"], capture_output=True, text=True)
total = len(result.stdout.strip().split("\n"))
print(f"Total commits in repo: {total}")
