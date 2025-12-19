-- Trigger para automatizar o vínculo:
-- Quando uma tarefá é criada ou editada em 'fato_tarefas', o colaborador é adicionado em 'project_members' automaticamente.

-- 1. Cria a função que executa a lógica
CREATE OR REPLACE FUNCTION public.auto_add_project_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se a tarefa tem colaborador e projeto
    IF NEW."ID_Colaborador" IS NOT NULL AND NEW."ID_Projeto" IS NOT NULL THEN
        -- Tenta inserir. Se já existir (conflito), não faz nada.
        INSERT INTO public.project_members (id_projeto, id_colaborador)
        VALUES (NEW."ID_Projeto", NEW."ID_Colaborador")
        ON CONFLICT (id_projeto, id_colaborador) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cria o gatilho (Trigger) na tabela fato_tarefas
DROP TRIGGER IF EXISTS trg_auto_add_member ON public.fato_tarefas;

CREATE TRIGGER trg_auto_add_member
AFTER INSERT OR UPDATE OF "ID_Colaborador" ON public.fato_tarefas
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_project_member();
