# Task: Fix Translation and Security Issues

## Overview
Addressed user request to fix translation gaps in print outputs, modify security settings for Payroll and Sales, and improve Thermal print layout for Arabic.

## Changes
1.  **Translations**:
    *   **Arabic (`ar`)**: Added missing keys for invoice generation including `soldBy`, `paymentTerms`, `includeInvoiceNumber`, `contactQuestions`, and `customerId`.
    *   **Chinese (`zh`)**: Added missing keys `soldBy`, `shopCopy`, and `customerId`.
    *   **Hindi (`hi`)**: Added missing key `customerId`.
    *   **Note**: Ensured critical print-related keys are present to prevent "missing" text in A4/Thermal prints.

2.  **Payroll Security**:
    *   **Sidebar**: Clicking "Payroll" now triggers the PIN verification modal (`pinAction = 'accessPayroll'`).
    *   **Logic**: Added a case in the PIN success handler to switch the active tab to `payroll` and close the sidebar only after successful PIN entry.

3.  **Sales Security**:
    *   **Sales Employee Selection**: Removed the PIN verification requirement when changing the sales employee in the Sell tab. The modal now opens directly.

4.  **Thermal Print Layout (Arabic)**:
    *   Updated `handlePrintInvoice` styles for Thermal format.
    *   Added conditional CSS: If `language === 'ar'`, apply `direction: rtl` and `text-align: center`.
    *   Centered `details` logic, table headers, and cells for Arabic to match user preference ("center as justify").

5.  **Print Date/Time Localization**:
    *   Updated `handlePrintInvoice` to use a `locale` variable derived from the selected `language` (e.g., 'ar-EG' for Arabic).
    *   Applied this `locale` to `toLocaleTimeString()` and `toLocaleDateString()` so that dates and times appear in the correct language format on the printed invoice.

## Files Modified
*   `src/App.js`

## Verification
*   **Print**: Check A4 and Thermal prints in Arabic, Chinese, and Hindi. Ensure:
    *   `Customer ID` is translated.
    *   Thermal print layout in Arabic is correct (RTL + Centered).
    *   Date and Time are localized.
*   **Payroll**: Verify that checking Payroll asks for PIN.
*   **Sales**: Verify that changing Employee does NOT ask for PIN.
