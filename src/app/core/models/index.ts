export interface LoginRequest { email: string; password: string; }
export interface LoginResponse {
  access_token: string; token_type: string;
  rol: 'Administrador' | 'Docente' | 'Alumno';
  email: string; id: number;
}
export interface JwtPayload {
  sub: string; rol: string; exp: number;
}

export interface Periodo {
  id: number; nombre: string; fecha_inicio: string;
  fecha_fin: string; plan_estudios?: string; activo: boolean;
}

export interface Materia {
  id: number; nrc: string; nombre: string; creditos?: number | null;
  seccion?: string; clave?: string;
  periodo_id: number; periodo_nombre?: string;
  docente_id?: number | null; docente_nombre?: string;
  horario?: string; activo?: boolean;
}

export interface Docente {
  id: number; nombre: string; apellido: string;
  email: string; clave_empleado: string; departamento?: string;
}

export interface Alumno {
  id: number; nombre: string; apellido: string;
  email: string; matricula: string; nrc?: string;
}

export interface Sesion {
  id: number; materia: number; docente: number;
  fecha: string; estado: 'activa' | 'cerrada';
}

export interface Asistencia {
  id: number; sesion: number; alumno: number;
  alumno_nombre?: string; alumno_matricula?: string;
  timestamp: string; presente: boolean;
}

export interface ReporteAsistencia {
  alumno_id: number; alumno_nombre: string; matricula: string;
  total_sesiones: number; asistencias: number; porcentaje: number;
}

export interface Calificacion {
  alumno_id: number; alumno_nombre: string; matricula: string;
  materia: string; calificacion: number; periodo: string;
}

export interface PaginatedResponse<T> {
  count: number; next: string | null; previous: string | null; results: T[];
}

export interface ApiResponse<T> {
  success: boolean; data: T | PaginatedResponse<T>; message?: string;
}
