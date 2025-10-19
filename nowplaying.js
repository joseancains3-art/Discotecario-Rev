let current = { release_id: null, at: 0 };

function cors(res){
  const allow = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res){
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET'){
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json(current);
  }

  if (req.method === 'POST'){
    const id = (req.query.release_id || '').toString();
    if (!id) return res.status(400).json({error:'missing release_id'});
    current = { release_id: id, at: Date.now() };
    return res.status(200).json({ ok:true, ...current });
  }

  return res.status(405).json({error:'Method not allowed'});
}
