-- Normalização de forma_pagamento para a lista padrão
-- Rodar no SQL Editor do Supabase

UPDATE exames SET forma_pagamento = 'PIX'
WHERE LOWER(TRIM(forma_pagamento)) = 'pix';

UPDATE exames SET forma_pagamento = 'Crédito'
WHERE LOWER(TRIM(forma_pagamento)) LIKE 'cr%dito%'
   OR LOWER(TRIM(forma_pagamento)) LIKE 'cart%o de cr%dito';

UPDATE exames SET forma_pagamento = 'Débito'
WHERE LOWER(TRIM(forma_pagamento)) IN ('débito', 'debito')
   OR LOWER(TRIM(forma_pagamento)) LIKE 'cart%o de d%bito';

UPDATE exames SET forma_pagamento = 'Espécie'
WHERE LOWER(TRIM(forma_pagamento)) IN ('espécie', 'especie', 'dinheiro');

UPDATE exames SET forma_pagamento = 'Pettop'
WHERE LOWER(TRIM(forma_pagamento)) = 'pettop';

UPDATE exames SET forma_pagamento = 'Petcare'
WHERE LOWER(TRIM(forma_pagamento)) = 'petcare';

UPDATE exames SET forma_pagamento = 'Eupet'
WHERE LOWER(TRIM(forma_pagamento)) = 'eupet';

UPDATE exames SET forma_pagamento = 'Petlove'
WHERE LOWER(TRIM(forma_pagamento)) = 'petlove';

-- Tudo que sobrou vira Outro
UPDATE exames SET forma_pagamento = 'Outro'
WHERE forma_pagamento IS NOT NULL
  AND TRIM(forma_pagamento) != ''
  AND forma_pagamento NOT IN ('PIX','Crédito','Débito','Espécie','Pettop','Petcare','Eupet','Petlove','Outro');
