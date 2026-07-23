-- Inicialização do banco de dados
-- Executado automaticamente pelo Docker na primeira vez

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca por similaridade de texto

-- Schema padrão já é public, mas garantimos as permissões
GRANT ALL PRIVILEGES ON DATABASE vinculo_db TO vinculo_user;
