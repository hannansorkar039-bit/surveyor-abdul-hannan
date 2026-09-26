# FINAL RECHECK AUDIT — PASSED

- Verified core HTML files and Service Worker.
- Calculator registration defaults corrected to the currently published ordinary sale/conveyance schedule:
  - Registration fee: 1%, minimum Tk 100.
  - Stamp duty: 1.5%.
  - Local government tax: selectable 2% / 3%.
  - Source tax: selectable 2% / 4% / 6% / 8% or fixed amount, with optional minimum amount.
  - N-Fee: Tk 24 per 300-word page.
  - NN-Fee: Tk 36 per 300-word page.
  - E-Fee: Tk 100.
  - Affidavit stamp: Tk 200.
  - LT-notice court fee: Tk 10.
- Calculator total and print/PDF reports include the above applicable fields.
- Service Worker cache version: v11.
- External CDN requests are intercepted/cached by the Service Worker after successful online access and can be served from Cache API when offline.
- Original site visual design was not intentionally redesigned.
- The calculator is clearly an estimate; actual fees depend on deed type, location/mouza, property class and applicable government schedules/notifications.
