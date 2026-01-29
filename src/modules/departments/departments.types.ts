
export interface Department {
    name: string;
    count?: number; // Number of jobs in this department
}

export interface CreateDepartmentRequest {
    name: string;
}

export interface UpdateDepartmentRequest {
    name: string;
}

export interface DepartmentResponse {
    name: string;
    jobCount?: number;
}
