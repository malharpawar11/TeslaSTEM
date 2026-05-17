export type Role = 'super_admin' | 'club_admin' | 'student';
export type ClubCategory = 'STEM' | 'Service' | 'Arts' | 'Culture' | 'Competition' | 'Wellness';
export interface Club { id:string; name:string; category:ClubCategory; description:string; meetingDay:string; meetingTime:string; location:string; advisor:string; grades:string[]; interests:string[]; officers:string[]; contactEmail:string; links:string[]; announcementCount:number; followers:number; approved:boolean; }
export interface Announcement { id:string; clubId:string; title:string; body:string; createdAt:string; }
