import { db } from "./config";
import { createGPAService, createAttendanceService, LeaderboardService } from "@bhemu/firebase";

export const gpaService = (userId: string) => createGPAService(db, userId);
export const attendanceService = (userId: string) => createAttendanceService(db, userId);
export { LeaderboardService };
