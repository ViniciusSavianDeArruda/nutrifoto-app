# Prompts

Prompts reutilizáveis para tarefas recorrentes com o Claude Code.

## Formato

Cada prompt é um arquivo `docs/prompts/<slug>.md` com:

```
# Título

## Quando usar

Descreva o caso de uso típico.

## Prompt

```
[texto do prompt, pronto para copiar]
```

## Variáveis

- `{{VARIAVEL}}`: descrição do que substituir
```

## Exemplos de prompts úteis para este projeto

- Criar migração de banco a partir de mudança no schema
- Adicionar endpoint com testes
- Revisar contrato de API após mudança de rota
- Atualizar CHANGELOG com entradas do git log
