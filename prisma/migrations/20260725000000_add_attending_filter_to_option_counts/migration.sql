CREATE OR REPLACE FUNCTION v2_get_option_counts(
    p_year_id TEXT,
    p_field_names TEXT[] DEFAULT NULL,
    p_statuses TEXT[] DEFAULT NULL,
    p_is_paid BOOLEAN DEFAULT NULL,
    p_is_attending BOOLEAN DEFAULT NULL
) RETURNS JSONB AS $$
SELECT COALESCE(jsonb_object_agg(sub.field_name, jsonb_build_object(
    'counts', sub.counts,
    'capacityLimits', sub.limits
)), '{}'::jsonb)
FROM (
    SELECT
        oc.field_name,
        jsonb_object_agg(oc.option_value, oc.count) AS counts,
        (SELECT COALESCE(jsonb_object_agg(cl.option_value, cl.max_count), '{}'::jsonb)
         FROM "v2_capacity_limits" cl
         JOIN "v2_form_fields" ff ON ff.id = cl.field_id
         WHERE ff.name = oc.field_name AND cl.year_id = p_year_id
        ) AS limits
    FROM (
    SELECT
        ff.name AS field_name,
        COALESCE(po.name, oli.value) AS option_value,
        SUM(oli.quantity)::int AS count
    FROM "v2_order_line_items" oli
    JOIN "v2_orders" o ON o.id = oli.order_id
    JOIN "v2_form_fields" ff ON ff.id = oli.field_id
    LEFT JOIN "v2_pricing_options" po ON po.id = oli.pricing_option_id
    LEFT JOIN "v2_order_people" op ON op.id = oli.person_id
    WHERE o.year_id = p_year_id AND o.is_test = false
      AND (p_field_names IS NULL OR ff.name = ANY(p_field_names))
      AND (p_statuses IS NULL OR o.status = ANY(p_statuses))
      AND (p_is_paid IS NULL OR o.is_paid = p_is_paid)
      AND (p_is_attending IS NULL OR op.is_attending = p_is_attending)
      AND CASE WHEN p_statuses IS NULL THEN o.status NOT IN ('CANCELLED','REJECTED') ELSE true END
      AND oli.value IS NOT NULL AND oli.value != '' AND oli.value != 'false'
    GROUP BY ff.name, COALESCE(po.name, oli.value)
    ) oc
    GROUP BY oc.field_name
) sub;
$$ LANGUAGE sql STABLE;
