// Tipos TypeScript para la base de datos
export interface Estudiante {
  id: string;
  onboarding_token: string | null;
  correo_estudiantil: string | null;
  correo_personal: string | null;
  nombre_completo_becado: string | null;
  auth_user_id: string | null;
  ha_completado_onboarding: boolean;
  sexo: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      estudiantes: {
        Row: Estudiante;
        Insert: Omit<Estudiante, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Estudiante, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

