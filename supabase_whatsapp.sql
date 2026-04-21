-- 1. Crear la tabla de pedidos_whatsapp
CREATE TABLE pedidos_whatsapp (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_telefono TEXT NOT NULL,
    texto_pedido TEXT NOT NULL,
    metodo_pago TEXT NOT NULL, -- 'Yape', 'Efectivo', etc.
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'rechazado'
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activar Row Level Security (RLS) pero permitir todo (para simplificar ya que es backend y caja local)
ALTER TABLE pedidos_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a anon y authenticated" 
ON pedidos_whatsapp FOR ALL 
USING (true) WITH CHECK (true);

-- 3. HABILITAR REALTIME (CRÍTICO PARA LAS NOTIFICACIONES EN LA CAJA)
-- Asegurarse de que la tabla emita eventos a los suscriptores conectados
begin;
  -- Verifica si 'supabase_realtime' ya existe, de lo contrario esto puede ignorarse en algunas versiones recientes,
  -- pero la forma canónica es añadir la tabla a la publicación de realtime
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for all tables;
commit;

-- (Alternativa si la bd te da error arriba) simplemente:
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_whatsapp;
