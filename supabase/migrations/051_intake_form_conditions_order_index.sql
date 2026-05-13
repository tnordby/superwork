-- Deterministic ordering for intake conditional rules (evaluation uses OR within targets; order only affects readability and future features).

ALTER TABLE public.intake_form_conditions
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

UPDATE public.intake_form_conditions AS c
SET order_index = s.rn
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY service_template_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.intake_form_conditions
) AS s
WHERE c.id = s.id;

CREATE INDEX IF NOT EXISTS intake_form_conditions_service_order_idx
  ON public.intake_form_conditions (service_template_id, order_index);
