// Test mock citizens reflecting the exact reference fixtures
export const DEMO_USERS = [
  {
    id: "USR-001",
    email: "rajesh@demo.local",
    username: "rajesh_kumar",
    password: "Demo@001",
    name: "Rajesh Kumar",
    role: "CITIZEN",
    status: "ACTIVE",
    activeRole: "OWNER",
    description: "Full verified titleholder with clean parcel",
    stats: {
      ownedParcels: 8,
      pendingApprovals: 0,
      deedNotifications: "Unavailable",
      avgTitleHealth: "Unavailable",
      jurisdiction: "Gautam Buddha Nagar, Uttar Pradesh"
    }
  },
  {
    id: "USR-005",
    email: "asif@demo.local",
    username: "asif_khan",
    password: "Demo@005",
    name: "Asif Khan",
    role: "CITIZEN",
    status: "ACTIVE",
    activeRole: "OWNER",
    description: "Joint titleholder & nominee",
    stats: {
      ownedParcels: 3,
      pendingApprovals: 1,
      deedNotifications: "2 Unread",
      avgTitleHealth: "94 / 100",
      jurisdiction: "Lucknow, Uttar Pradesh"
    }
  },
  {
    id: "USR-008",
    email: "meera@demo.local",
    username: "meera_sharma",
    password: "Demo@008",
    name: "Meera Sharma",
    role: "CITIZEN",
    status: "ACTIVE",
    activeRole: "NOMINEE",
    description: "Registered succession nominee",
    stats: {
      ownedParcels: 0,
      pendingApprovals: 0,
      deedNotifications: "1 Notice",
      avgTitleHealth: "100 / 100",
      jurisdiction: "Gautam Buddha Nagar, Uttar Pradesh"
    }
  }
];

// Target buyers for sell token issuance
export const TARGET_BUYERS = [
  { id: "USR-BUY-001", name: "Amit Sharma", wallet: "0x7F2a...98Cd" },
  { id: "USR-BUY-002", name: "Pooja Verma", wallet: "0x4B3c...E120" },
  { id: "USR-BUY-003", name: "Rohan Kapoor", wallet: "0x89Df...319A" },
  { id: "USR-BUY-004", name: "Neha Gupta", wallet: "0x12aA...B592" }
];

// Registered cadastral parcels matching reference screenshot UI
export const INITIAL_PARCELS = [
  {
    id: "UP-0001-CLEAN",
    title: "UP-0001-CLEAN",
    status: "VERIFIED",
    statusVariant: "success",
    surveyNumber: "SN-245-A",
    areaSqm: 1200,
    tenure: "JOINT",
    health: "/100",
    healthScore: 98,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2018-04-12",
    deedHash: "0x7f9a81c2049e...b1",
    blockchainTx: "0x892a014ef982...c014",
    nomineeName: "Sunita Kumar",
    nomineeRelation: "Daughter",
    nomineeShare: "100%",
    nomineeStatus: "Dormant (Owner Active)"
  },
  {
    id: "UP-0002-CLEAN",
    title: "UP-0002-CLEAN",
    status: "VERIFIED",
    statusVariant: "success",
    surveyNumber: "SN-118-C",
    areaSqm: 850,
    tenure: "SOLE",
    health: "/100",
    healthScore: 100,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2019-11-20",
    deedHash: "0x3b1c8a99201e...4f",
    blockchainTx: "0x771ac9018420...99ab",
    nomineeName: "Arun Kumar",
    nomineeRelation: "Son",
    nomineeShare: "100%",
    nomineeStatus: "Dormant (Owner Active)"
  },
  {
    id: "UP-0003-DUPLICATE-TARGET",
    title: "UP-0003-DUPLICATE-TARGET",
    status: "DISPUTED",
    statusVariant: "danger",
    surveyNumber: "SN-330-B",
    areaSqm: 2000,
    tenure: "SOLE",
    health: "/100",
    healthScore: 42,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2016-08-15",
    deedHash: "0x20cb84e19811...da",
    blockchainTx: "0x112fa0992384...71ab",
    nomineeName: null,
    flagReason: "Conflicting deed registry timestamp filed at Ghaziabad registrar."
  },
  {
    id: "UP-0004-BACKDATE-TARGET",
    title: "UP-0004-BACKDATE-TARGET",
    status: "REVIEW",
    statusVariant: "warning",
    surveyNumber: "SN-410-D",
    areaSqm: 1500,
    tenure: "SOLE",
    health: "/100",
    healthScore: 65,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2017-03-29",
    deedHash: "0x98cf231908aa...8b",
    blockchainTx: "0x66fe4920b129...30ca",
    nomineeName: null,
    flagReason: "Prior deed registration chronological anomaly detected by AI audit."
  },
  {
    id: "UP-0005-CLEAN",
    title: "UP-0005-CLEAN",
    status: "VERIFIED WITH ENCUMBRANCE",
    statusVariant: "warning",
    surveyNumber: "SN-500-A",
    areaSqm: 3000,
    tenure: "SOLE",
    health: "/100",
    healthScore: 78,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2020-01-14",
    deedHash: "0x44ae8019ab23...4d",
    blockchainTx: "0x22de8194cc91...e45f",
    nomineeName: "Kavita Kumar",
    nomineeRelation: "Spouse",
    nomineeShare: "100%",
    nomineeStatus: "Dormant (Owner Active)",
    encumbranceDetails: "State Bank of India hypothecation loan INR 45,00,000"
  },
  {
    id: "UP-0007-FLAGGED-TARGET",
    title: "UP-0007-FLAGGED-TARGET",
    status: "SUCCESSION PENDING",
    statusVariant: "default",
    surveyNumber: "SN-712-F",
    areaSqm: 1000,
    tenure: "SOLE",
    health: "/100",
    healthScore: 70,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2015-06-10",
    deedHash: "0x12fa998822ab...66",
    blockchainTx: "0x55dc9901aa32...7710",
    nomineeName: "Sunita Kumar",
    nomineeRelation: "Daughter",
    nomineeShare: "100%",
    nomineeStatus: "Dormant (Owner Active)"
  },
  {
    id: "UP-0006-VELOCITY-TARGET",
    title: "UP-0006-VELOCITY-TARGET",
    status: "FROZEN",
    statusVariant: "danger",
    surveyNumber: "SN-610-E",
    areaSqm: 900,
    tenure: "SOLE",
    health: "/100",
    healthScore: 30,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2021-09-02",
    deedHash: "0x89ad0014ee29...77",
    blockchainTx: "0x9911fa430091...bb88",
    nomineeName: null,
    flagReason: "High-frequency conveyance velocity trigger locked by Registrar."
  },
  {
    id: "UP-0008-SINGLE-OWNER",
    title: "UP-0008-SINGLE-OWNER",
    status: "VERIFIED",
    statusVariant: "success",
    surveyNumber: "SN-800-A",
    areaSqm: 1500,
    tenure: "SOLE",
    health: "/100",
    healthScore: 100,
    primaryOwner: "Rajesh Kumar",
    registeredDate: "2022-04-18",
    deedHash: "0x55aa018233fe...11",
    blockchainTx: "0x33ef9012ac88...44aa",
    nomineeName: null
  }
];

// Associated Nominee property records (matching Image 4)
export const NOMINEE_PROPERTIES = [
  {
    id: "UP-0001-CLEAN",
    title: "UP-0001-CLEAN",
    status: "VERIFIED",
    tag: "Nominee Endorsed",
    surveyNumber: "SN-245-A",
    areaSqm: 1200,
    designatedNominee: "Sunita Kumar",
    relation: "Daughter",
    endorsedShare: "100%",
    statusNote: "Dormant (Owner Active)",
    primaryOwner: "Rajesh Kumar",
    canIssueKey: false
  }
];
