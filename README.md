# TitleLock Enterprise Architecture & Database Documentation

> **TitleLock Cadastre Ledger & Title Protection System**  
> AI-assisted, blockchain-backed land title verification and fraud prevention platform for Government of India land administration.

---

## 1. High-Level Architecture

The system is organized into a clean, modular, three-tier architecture:

```
TITLELOCK_Blockchain/
├── data/                      # Canonical JSON Datasets & Cadastre DB
│   ├── properties.json        # 200+ Land parcel deeds, coordinates, ULPINs, owners
│   └── pending_transfers.json # Transfer petitions, mutation requests, risk logs
│
├── frontend/                  # React 18 + Vite + Tailwind CSS Application
│   ├── src/
│   │   ├── constants/         # Static fixtures (mockData.js, seed users)
│   │   ├── services/          # Centralized Database Service layer (databaseService.js)
│   │   ├── hooks/             # Custom state hooks (useAuth.jsx, useTheme.jsx)
│   │   ├── layouts/           # App shells, Navbar (glass-nav), Sidebar (glass-sidebar)
│   │   ├── pages/             # Citizen pages (Dashboard, Properties, Deeds, Transfers, etc.)
│   │   ├── routes/            # App routing (AppRoutes.jsx)
│   │   └── index.css          # Design system tokens (glass-panel, mesh gradients)
│
└── backend/                   # Python FastAPI Enterprise Backend
    ├── app/
    │   ├── main.py            # Application entrypoint & health probe
    │   ├── config.py          # Strict Pydantic configuration & environment settings
    │   ├── auth/              # Authentication & cryptographic session management
    │   ├── parcels/           # Cadastre parcel registry & GeoJSON service
    │   ├── transfers/         # Mutation petitions & escrow transactions
    │   ├── fraud/             # Double-selling & encumbrance anomaly detection
    │   ├── chain/             # Blockchain smart contract connector (mock/RPC)
    │   └── audit/             # Tamper-evident immutable ledger logging
    ├── tests/                 # Pytest test suite
    └── requirements.txt       # Python dependencies
```

---

## 2. Database Schema & Data Models

### A. Cadastral Parcel Entity (`data/properties.json`)
Each land parcel is identified by a unique **ULPIN** (Unique Land Parcel Identification Number) with spatial boundaries and cryptographic health:

| Field | Type | Description |
|---|---|---|
| `ulpin` | `String` | Unique nationwide identifier (e.g., `UP-0001-CLEAN`) |
| `survey_number` | `String` | Cadastral land survey number (e.g., `SN-712-B`) |
| `current_owner` | `String` | Legal titleholder registered in Record of Rights |
| `ownership_type` | `String` | `SOLE`, `JOINT`, or `INSTITUTIONAL` |
| `owners` | `Array<Owner>` | List of titleholders with percentage shares and wallet addresses |
| `ownership_policy` | `Object` | Multi-sig quorum requirements (`required_approvals`, `total_owners`) |
| `nominees` | `Array<Nominee>` | Succession nominees with inheritance shares |
| `encumbrances` | `Array<Encumbrance>` | Bank liens, mortgages, and charges against the title |
| `disputes` | `Array<Dispute>` | Active litigation, stay orders, or civil court cases |
| `frozen` | `Boolean` | True if the parcel is locked due to investigation |
| `area_sqm` | `Number` | Verified plot area in square meters |
| `boundary` | `Array<[lng, lat]>` | GPS boundary polygon coordinates |
| `registration_office` | `String` | Sub-Registrar Office jurisdiction |
| `title_status` | `String` | `VERIFIED`, `FLAGGED`, or `UNDER_REVIEW` |
| `risk_status` | `String` | Risk level: `LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK` |

### B. Transfer & Mutation Petition (`data/pending_transfers.json`)
| Field | Type | Description |
|---|---|---|
| `request_id` | `String` | Unique transfer petition ID (e.g., `REQ-01`) |
| `ulpin` | `String` | Target land parcel ULPIN |
| `seller` | `String` | Titleholder initiating or consenting to transfer |
| `buyer` | `String` | Intended buyer or transferee |
| `claimed_area_sqm` | `Number` | Area specified in sale deed |
| `transaction_date` | `String` | Filing timestamp (ISO format) |
| `note` | `String` | Title audit notes, fraud alerts, or verification report |

---

## 3. Frontend Service Layer (`CadastreDatabaseService`)

Located in [`frontend/src/services/databaseService.js`](file:///c:/Users/yash1/Downloads/TITLELOCK_Blockchain/frontend/src/services/databaseService.js), this service provides a clean single source of truth for frontend storage:

- **`getActiveUser()` / `setActiveUser()`**: Reads and persists the active authenticated citizen profile.
- **`getParcels()` / `saveParcels()`**: Manages cadastral properties with state-level edits.
- **`getSellTokens()` / `saveSellTokens()`**: Manages cryptographic sell token authorizations issued by citizens.
- **`resetToDefaults()`**: Cleanses local modifications and restores sandbox state.

---

## 4. How to Find & Modify Components

1. **Pages**:
   - `frontend/src/pages/CitizenDashboardPage.jsx`: Main citizen landing dashboard with metrics and parcels.
   - `frontend/src/pages/CitizenLoginPage.jsx`: Sign in and register portal with dual theme support.
   - `frontend/src/pages/CitizenPropertiesPage.jsx`: Filterable land parcel inventory and deed view.
   - `frontend/src/pages/CitizenTokensPage.jsx`: Cryptographic sell authorization token issuance.
   - `frontend/src/pages/CitizenTransfersPage.jsx`: Mutation requests and transfer workflow tracking.
   - `frontend/src/pages/CitizenNomineesPage.jsx`: Succession and legal heir declarations.
   - `frontend/src/pages/CitizenRecoveryPage.jsx`: Key recovery and credential escrow.
   - `frontend/src/pages/CitizenPublicMapPage.jsx`: 3D GeoJSON cadastral map viewer.

2. **Styling & Design System**:
   - `frontend/src/index.css`: Glassmorphic design tokens (`.glass-panel`, `.glass-sidebar`, `.glass-nav`, `.glass-card-interactive`).
   - Tailwind theme configuration with full class-based dark mode (`darkMode: 'class'`).

3. **Backend API**:
   - `backend/app/main.py`: Entrypoint for FastAPI server (`port 5001`).
   - `backend/app/config.py`: Environment settings (`development`, `testing`, `production`).