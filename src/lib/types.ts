export type Project = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  name: string;
  projectId: string;
  category?: string;
};

export type TimeEntryStatus =
  | 'Arbete'
  | 'Sjuk'
  | 'Sjukskriven'
  | 'VAB'
  | 'Semester'
  | 'Permission'
  | 'Tjänstledig'
  | 'Ledig'
  | 'Övrig frånvaro'
  | 'Tom';

export type TimeEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string; // Mån, Tis, etc.
  weekNumber: number;
  isWeekend: boolean;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  totalHours: number;
  status: TimeEntryStatus;
  project?: string;
  notes?: string;
  profileId: string;
};

export type FirestoreTimeEntry = {
    id: string;
    startTime: string; // ISO string
    endTime: string | null; // ISO string
    status: TimeEntryStatus;
    notes?: string;
    projectName?: string;
    profileId: string;
};

export type MonthlySummary = {
    workedHours: number;
    monthNorm: number;
    timeDiff: number;
    absence: {
        sickHours: number;
        vacationDays: number;
        otherAbsenceHours: number;
    }
}

export type MonthlyData = {
    tableRows: TimeEntry[];
    summary: MonthlySummary;
}

export type Schedule = {
    id: string; // YYYY-WW
    year: number;
    week: number;
    days: {
        [dayOfWeek: number]: string; // 1-7 for Mon-Sun, value is "08-16" or similar
    };
    profileId: string;
};


export type Permissions = {
    viewLiveCost?: boolean;
    viewAbsence?: boolean;
    handleTimeReports?: boolean;
    handleAbsence?: boolean;
    handleUsers?: boolean;
    approvePayroll?: boolean;
    generateContracts?: boolean;
    handlePermissions?: boolean;
    editOwnTimes?: boolean;
    handleSchema?: boolean;
};

export type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt?: any;
    updatedAt?: any;

    // Employment
    title?: string;
    employmentType?: 'Tillsvidare' | 'Provanställning' | 'Visstidsanställning' | '832-anställning';
    workHoursType?: 'Heltid' | 'Deltid';
    weeklyHours?: number;
    employmentPercentage?: number;
    salaryType?: 'Fast' | 'Timlön';
    salaryValue?: number;
    startDate?: string;
    endDate?: string | null;
    noticePeriod?: string;
    workplace?: string;
    benefits?: string;
    vacationDays?: number;
    collectiveAgreement?: string;
    insurances?: string;
    otherInfo?: string;

    // Personal
    ssn?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    employeeId: string;

    // Live Status
    isClockedIn?: boolean;
    shiftStartTime?: string; // ISO String
    activeTimeEntryId?: string;
    lastActivity?: any;

    // System
    permissions: Permissions;
};


export type CompanySettings = {
    companyName?: string;
    orgNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    contactPerson?: string;
    companyPhone?: string;
    companyEmail?: string;
    standardTerms?: string;
};

export type AdjustmentLog = {
    id: string;
    adjustingUserId: string;
    adjustingUserName: string;
    action: string;
    originalTime: string; // ISO String
    adjustedTime: string; // ISO String
    createdAt: any; // ServerTimestamp
};

    
