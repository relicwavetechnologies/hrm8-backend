import { Prisma } from '@prisma/client';

export class CandidateMapper {
    static workExperienceToPrisma(data: any): any {
        return {
            company: data.company,
            role: data.role,
            start_date: data.startDate ? new Date(data.startDate) : undefined,
            end_date: data.endDate ? new Date(data.endDate) : null,
            current: !!data.current,
            description: data.description,
            location: data.location,
        };
    }

    static educationToPrisma(data: any): any {
        return {
            institution: data.institution,
            degree: data.degree,
            field: data.field,
            start_date: data.startDate ? new Date(data.startDate) : undefined,
            end_date: data.endDate ? new Date(data.endDate) : null,
            current: !!data.current,
            grade: data.grade,
            description: data.description,
        };
    }

    static certificationToPrisma(data: any): any {
        return {
            name: data.name,
            issuing_org: data.issuingOrg || data.issuing_org,
            issue_date: data.issueDate ? new Date(data.issueDate) : undefined,
            expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
            credential_id: data.credentialId,
            credential_url: data.credentialUrl,
            does_not_expire: data.doesNotExpire !== undefined ? !!data.doesNotExpire : undefined,
        };
    }

    static trainingToPrisma(data: any): any {
        return {
            course_name: data.courseName || data.course_name || data.name,
            provider: data.provider,
            completed_date: data.completedDate ? new Date(data.completedDate) : undefined,
            duration: data.duration,
            description: data.description,
            certificate_url: data.certificateUrl || data.certificate_url,
        };
    }

    static skillToPrisma(data: any): any {
        return {
            name: data.name,
            level: data.level || 'intermediate',
        };
    }

    static profileToPrisma(data: any): any {
        const prismaData: any = { ...data };

        // Map camelCase to snake_case
        if (data.firstName) prismaData.first_name = data.firstName;
        if (data.lastName) prismaData.last_name = data.lastName;
        if (data.linkedInUrl) prismaData.linked_in_url = data.linkedInUrl;
        if (data.visaStatus) prismaData.visa_status = data.visaStatus;
        if (data.workEligibility) prismaData.work_eligibility = data.workEligibility;
        if (data.jobTypePreference) prismaData.job_type_preference = data.jobTypePreference;
        if (data.salaryPreference) prismaData.salary_preference = data.salaryPreference;
        if (data.relocationWilling !== undefined) prismaData.relocation_willing = data.relocationWilling;
        if (data.remotePreference) prismaData.remote_preference = data.remotePreference;
        if (data.phone) prismaData.phone = data.phone;
        if (data.photo) prismaData.photo = data.photo;
        if (data.city) prismaData.city = data.city;
        if (data.state) prismaData.state = data.state;
        if (data.country) prismaData.country = data.country;

        // Remove camelCase fields to avoid Prisma errors
        delete prismaData.firstName;
        delete prismaData.lastName;
        delete prismaData.linkedInUrl;
        delete prismaData.visaStatus;
        delete prismaData.workEligibility;
        delete prismaData.jobTypePreference;
        delete prismaData.salaryPreference;
        delete prismaData.relocationWilling;
        delete prismaData.remotePreference;
        delete prismaData.phone;
        delete prismaData.photo;
        delete prismaData.city;
        delete prismaData.state;
        delete prismaData.country;

        return prismaData;
    }

    // Response Mappers
    static toWorkHistoryResponse(exp: any) {
        return {
            id: exp.id,
            company: exp.company,
            role: exp.role,
            startDate: exp.start_date,
            endDate: exp.end_date,
            current: exp.current,
            description: exp.description,
            location: exp.location,
        };
    }

    static toEducationResponse(edu: any) {
        return {
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.start_date,
            endDate: edu.end_date,
            current: edu.current,
            grade: edu.grade,
            description: edu.description,
        };
    }

    static toCertificationResponse(cert: any) {
        return {
            id: cert.id,
            name: cert.name,
            issuingOrg: cert.issuing_org,
            issueDate: cert.issue_date,
            expiryDate: cert.expiry_date,
            credentialId: cert.credential_id,
            credentialUrl: cert.credential_url,
            doesNotExpire: cert.does_not_expire,
        };
    }

    static toTrainingResponse(t: any) {
        return {
            id: t.id,
            courseName: t.course_name,
            provider: t.provider,
            completedDate: t.completed_date,
            duration: t.duration,
            description: t.description,
            certificateUrl: t.certificate_url,
        };
    }

    static toResumeResponse(r: any) {
        return {
            id: r.id,
            fileUrl: r.file_url,
            fileName: r.file_name,
            fileSize: r.file_size,
            fileType: r.file_type,
            isDefault: r.is_default,
            uploadedAt: r.uploaded_at,
        };
    }

    static toCoverLetterResponse(c: any) {
        return {
            id: c.id,
            title: c.title,
            content: c.content,
            fileUrl: c.file_url,
            fileName: c.file_name,
            isTemplate: c.is_template,
            isDraft: c.is_draft,
            createdAt: c.created_at,
        };
    }

    static toPortfolioResponse(p: any) {
        return {
            id: p.id,
            title: p.title,
            type: p.type,
            fileUrl: p.file_url,
            fileName: p.file_name,
            fileSize: p.file_size,
            fileType: p.file_type,
            externalUrl: p.external_url,
            platform: p.platform,
            description: p.description,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
        };
    }

    static toSkillResponse(skill: any) {
        return {
            id: skill.id,
            name: skill.name,
            level: skill.level,
        };
    }
}
