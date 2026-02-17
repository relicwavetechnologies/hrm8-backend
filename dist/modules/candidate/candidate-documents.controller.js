"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateDocumentsController = void 0;
const controller_1 = require("../../core/controller");
const cloudinary_service_1 = require("../storage/cloudinary.service");
const resume_parser_service_1 = require("../ai/resume-parser.service");
const prisma_1 = require("../../utils/prisma");
const candidate_repository_1 = require("./candidate.repository");
const multer_1 = __importDefault(require("multer"));
// Multer configuration for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, PNG allowed.'));
        }
    },
});
class CandidateDocumentsController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        // Middleware exports for route mounting
        // Middleware exports for route mounting
        this.uploadSingle = upload.single('file');
        this.uploadResumeMiddleware = upload.single('resume');
        // RESUMES
        this.listResumes = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const resumes = await prisma_1.prisma.candidateResume.findMany({
                    where: { candidate_id: req.candidate.id },
                    orderBy: [
                        { is_default: 'desc' },
                        { uploaded_at: 'desc' }
                    ],
                });
                const mappedResumes = resumes.map(resume => ({
                    id: resume.id,
                    fileName: resume.file_name,
                    fileUrl: resume.file_url,
                    fileSize: resume.file_size,
                    fileType: resume.file_type,
                    isDefault: resume.is_default,
                    version: resume.version,
                    uploadedAt: resume.uploaded_at,
                }));
                return this.sendSuccess(res, mappedResumes);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.parseResume = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                if (!req.file)
                    return this.sendError(res, new Error('No file uploaded'), 400);
                const parsedData = await resume_parser_service_1.ResumeParserService.parseResume(req.file.buffer, req.file.mimetype);
                return this.sendSuccess(res, parsedData);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.uploadResume = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                if (!req.file)
                    return this.sendError(res, new Error('No file uploaded'), 400);
                // Upload to Cloudinary
                const uploadResult = await cloudinary_service_1.CloudinaryService.uploadMulterFile(req.file, {
                    folder: `hrm8/candidates/${req.candidate.id}/resumes`,
                    resourceType: 'raw',
                });
                // Get the latest version number
                const latestResume = await prisma_1.prisma.candidateResume.findFirst({
                    where: { candidate_id: req.candidate.id },
                    orderBy: { version: 'desc' },
                });
                const version = latestResume ? latestResume.version + 1 : 1;
                // Parse resume (attempt extraction, don't block on failure)
                let parsedData = null;
                try {
                    parsedData = await resume_parser_service_1.ResumeParserService.parseResume(req.file.buffer, req.file.mimetype);
                }
                catch (parseError) {
                    console.warn('[ResumeUpload] Parsing failed, skipping:', parseError);
                }
                // Create database record
                const resume = await prisma_1.prisma.candidateResume.create({
                    data: {
                        candidate_id: req.candidate.id,
                        file_name: req.file.originalname,
                        file_url: uploadResult.secureUrl,
                        file_size: req.file.size,
                        file_type: req.file.mimetype,
                        version,
                        is_default: version === 1, // First resume is default
                    },
                });
                // Sync with profile if default
                if (resume.is_default) {
                    const repo = new candidate_repository_1.CandidateRepository();
                    await repo.updateResumeUrl(req.candidate.id, resume.file_url);
                }
                const mappedResume = {
                    id: resume.id,
                    fileName: resume.file_name,
                    fileUrl: resume.file_url,
                    fileSize: resume.file_size,
                    fileType: resume.file_type,
                    isDefault: resume.is_default,
                    version: resume.version,
                    uploadedAt: resume.uploaded_at,
                };
                res.status(201);
                return this.sendSuccess(res, mappedResume, 'Resume uploaded successfully');
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.setDefaultResume = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const resumeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                // Verify ownership
                const resume = await prisma_1.prisma.candidateResume.findUnique({
                    where: { id: resumeId },
                });
                if (!resume || resume.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Resume not found'), 404);
                }
                // Unset all defaults
                await prisma_1.prisma.candidateResume.updateMany({
                    where: { candidate_id: req.candidate.id },
                    data: { is_default: false },
                });
                // Set new default
                const updated = await prisma_1.prisma.candidateResume.update({
                    where: { id: resumeId },
                    data: { is_default: true },
                });
                // Sync with profile
                const repo = new candidate_repository_1.CandidateRepository();
                await repo.updateResumeUrl(req.candidate.id, updated.file_url);
                const mappedResume = {
                    id: updated.id,
                    fileName: updated.file_name,
                    fileUrl: updated.file_url,
                    fileSize: updated.file_size,
                    fileType: updated.file_type,
                    isDefault: updated.is_default,
                    version: updated.version,
                    uploadedAt: updated.uploaded_at,
                };
                return this.sendSuccess(res, mappedResume);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteResume = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const resumeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const resume = await prisma_1.prisma.candidateResume.findUnique({
                    where: { id: resumeId },
                });
                if (!resume || resume.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Resume not found'), 404);
                }
                // Note: Cloudinary deletion skipped - public_id not stored in schema
                // If needed in future, add cloudinary_public_id column to schema
                // Delete from database
                await prisma_1.prisma.candidateResume.delete({
                    where: { id: resumeId },
                });
                // If it was the default, clear it from candidate profile
                if (resume.is_default) {
                    const repo = new candidate_repository_1.CandidateRepository();
                    await repo.updateResumeUrl(req.candidate.id, null);
                }
                return this.sendSuccess(res, { message: 'Resume deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // COVER LETTERS
        this.listCoverLetters = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const coverLetters = await prisma_1.prisma.candidateCoverLetter.findMany({
                    where: { candidate_id: req.candidate.id },
                    orderBy: { updated_at: 'desc' },
                });
                const mappedCoverLetters = coverLetters.map(cl => ({
                    id: cl.id,
                    title: cl.title,
                    content: cl.content,
                    fileUrl: cl.file_url,
                    fileName: cl.file_name,
                    fileSize: cl.file_size,
                    fileType: cl.file_type,
                    isTemplate: cl.is_template,
                    isDraft: cl.is_draft,
                    createdAt: cl.created_at,
                    updatedAt: cl.updated_at,
                }));
                return this.sendSuccess(res, mappedCoverLetters);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createCoverLetter = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { title, content, isTemplate, isDraft } = req.body;
                let fileUrl = null;
                let fileName = null;
                // If file attached, upload it
                if (req.file) {
                    const uploadResult = await cloudinary_service_1.CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${req.candidate.id}/cover-letters`,
                        resourceType: 'raw',
                    });
                    fileUrl = uploadResult.secureUrl;
                    fileName = req.file.originalname;
                }
                const coverLetter = await prisma_1.prisma.candidateCoverLetter.create({
                    data: {
                        candidate_id: req.candidate.id,
                        title,
                        content: content || null,
                        file_url: fileUrl,
                        file_name: fileName,
                        is_template: isTemplate === 'true' || isTemplate === true,
                        is_draft: isDraft === 'true' || isDraft === true,
                    },
                });
                const mappedCoverLetter = {
                    id: coverLetter.id,
                    title: coverLetter.title,
                    content: coverLetter.content,
                    fileUrl: coverLetter.file_url,
                    fileName: coverLetter.file_name,
                    fileSize: coverLetter.file_size,
                    fileType: coverLetter.file_type,
                    isTemplate: coverLetter.is_template,
                    isDraft: coverLetter.is_draft,
                    createdAt: coverLetter.created_at,
                    updatedAt: coverLetter.updated_at,
                };
                res.status(201);
                return this.sendSuccess(res, mappedCoverLetter);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateCoverLetter = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const existing = await prisma_1.prisma.candidateCoverLetter.findUnique({ where: { id } });
                if (!existing || existing.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Cover letter not found'), 404);
                }
                const { title, content, isTemplate, isDraft } = req.body;
                const updateData = {
                    title: title || existing.title,
                    content: content !== undefined ? content : existing.content,
                    is_template: isTemplate !== undefined ? (isTemplate === 'true' || isTemplate === true) : existing.is_template,
                    is_draft: isDraft !== undefined ? (isDraft === 'true' || isDraft === true) : existing.is_draft,
                };
                // Handle file update
                if (req.file) {
                    const uploadResult = await cloudinary_service_1.CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${req.candidate.id}/cover-letters`,
                        resourceType: 'raw',
                    });
                    updateData.file_url = uploadResult.secureUrl;
                    updateData.file_name = req.file.originalname;
                }
                const updated = await prisma_1.prisma.candidateCoverLetter.update({
                    where: { id },
                    data: updateData,
                });
                const mappedCoverLetter = {
                    id: updated.id,
                    title: updated.title,
                    content: updated.content,
                    fileUrl: updated.file_url,
                    fileName: updated.file_name,
                    fileSize: updated.file_size,
                    fileType: updated.file_type,
                    isTemplate: updated.is_template,
                    isDraft: updated.is_draft,
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at,
                };
                return this.sendSuccess(res, mappedCoverLetter);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteCoverLetter = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const coverLetter = await prisma_1.prisma.candidateCoverLetter.findUnique({ where: { id } });
                if (!coverLetter || coverLetter.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Cover letter not found'), 404);
                }
                // Note: Cloudinary deletion skipped - public_id not stored in schema
                await prisma_1.prisma.candidateCoverLetter.delete({ where: { id } });
                return this.sendSuccess(res, { message: 'Cover letter deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // PORTFOLIO
        this.listPortfolioItems = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const portfolioItems = await prisma_1.prisma.candidatePortfolio.findMany({
                    where: { candidate_id: req.candidate.id },
                    orderBy: { updated_at: 'desc' },
                });
                const mappedPortfolioItems = portfolioItems.map(item => ({
                    id: item.id,
                    title: item.title,
                    type: item.type,
                    fileUrl: item.file_url,
                    fileName: item.file_name,
                    fileSize: item.file_size,
                    fileType: item.file_type,
                    externalUrl: item.external_url,
                    platform: item.platform,
                    description: item.description,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                }));
                return this.sendSuccess(res, mappedPortfolioItems);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createPortfolioItem = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { title, type, externalUrl, platform, description } = req.body;
                let fileUrl = null;
                let fileName = null;
                if (type === 'file' && req.file) {
                    const uploadResult = await cloudinary_service_1.CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${req.candidate.id}/portfolio`,
                        resourceType: 'auto',
                    });
                    fileUrl = uploadResult.secureUrl;
                    fileName = req.file.originalname;
                }
                const portfolio = await prisma_1.prisma.candidatePortfolio.create({
                    data: {
                        candidate_id: req.candidate.id,
                        title,
                        type,
                        file_url: fileUrl,
                        file_name: fileName,
                        external_url: externalUrl || null,
                        platform: platform || null,
                        description: description || null,
                    },
                });
                const mappedPortfolioItem = {
                    id: portfolio.id,
                    title: portfolio.title,
                    type: portfolio.type,
                    fileUrl: portfolio.file_url,
                    fileName: portfolio.file_name,
                    fileSize: portfolio.file_size,
                    fileType: portfolio.file_type,
                    externalUrl: portfolio.external_url,
                    platform: portfolio.platform,
                    description: portfolio.description,
                    createdAt: portfolio.created_at,
                    updatedAt: portfolio.updated_at,
                };
                res.status(201);
                return this.sendSuccess(res, mappedPortfolioItem);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePortfolioItem = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const existing = await prisma_1.prisma.candidatePortfolio.findUnique({ where: { id } });
                if (!existing || existing.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Portfolio item not found'), 404);
                }
                const { title, externalUrl, platform, description } = req.body;
                const updateData = {
                    title: title || existing.title,
                    external_url: externalUrl !== undefined ? externalUrl : existing.external_url,
                    platform: platform !== undefined ? platform : existing.platform,
                    description: description !== undefined ? description : existing.description,
                };
                if (req.file) {
                    const uploadResult = await cloudinary_service_1.CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${req.candidate.id}/portfolio`,
                        resourceType: 'auto',
                    });
                    updateData.file_url = uploadResult.secureUrl;
                    updateData.file_name = req.file.originalname;
                }
                const updated = await prisma_1.prisma.candidatePortfolio.update({
                    where: { id },
                    data: updateData,
                });
                const mappedPortfolioItem = {
                    id: updated.id,
                    title: updated.title,
                    type: updated.type,
                    fileUrl: updated.file_url,
                    fileName: updated.file_name,
                    fileSize: updated.file_size,
                    fileType: updated.file_type,
                    externalUrl: updated.external_url,
                    platform: updated.platform,
                    description: updated.description,
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at,
                };
                return this.sendSuccess(res, mappedPortfolioItem);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deletePortfolioItem = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const item = await prisma_1.prisma.candidatePortfolio.findUnique({ where: { id } });
                if (!item || item.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Portfolio item not found'), 404);
                }
                // Note: Cloudinary deletion skipped - public_id not stored in schema
                await prisma_1.prisma.candidatePortfolio.delete({ where: { id } });
                return this.sendSuccess(res, { message: 'Portfolio item deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.CandidateDocumentsController = CandidateDocumentsController;
