import express from 'express';

// In-Memory Seed Data for Development / Demo
let ldapDomains = [
  {
    id: '1',
    name: 'parszarasa.local',
    display_name: 'دامین مرکزی (پارس زرآسا)',
    netbios_name: 'PARSZARASA',
    domain_controllers: '192.168.1.10,192.168.1.11',
    base_dn: 'DC=parszarasa,DC=local',
    user_dn: 'OU=Users,DC=parszarasa,DC=local',
    is_default: true,
    is_active: true,
    sync_interval_hours: 6,
    default_voip_prefix: '1',
  },
  {
    id: '2',
    name: 'tehran.corp',
    display_name: 'شعبه تهران (Tehran Branch)',
    netbios_name: 'TEH_CORP',
    domain_controllers: '192.168.20.10',
    base_dn: 'DC=tehran,DC=corp',
    user_dn: 'OU=Personnel,DC=tehran,DC=corp',
    is_default: false,
    is_active: true,
    sync_interval_hours: 12,
    default_voip_prefix: '2',
  },
  {
    id: '3',
    name: 'factory.zarasa',
    display_name: 'کارخانجات صنعتی (Factory)',
    netbios_name: 'FACTORY',
    domain_controllers: '192.168.50.10',
    base_dn: 'DC=factory,DC=zarasa',
    user_dn: 'OU=FactoryStaff,DC=factory,DC=zarasa',
    is_default: false,
    is_active: true,
    sync_interval_hours: 24,
    default_voip_prefix: '3',
  },
];

let departments: any[] = [
  { id: 'all', name: 'تمام واحدها', code: 'ALL', sort_order: 0 },
  { id: '1', name: 'فناوری اطلاعات و ارتباطات', code: 'IT', sort_order: 1 },
  { id: '2', name: 'مدیریت و منابع انسانی', code: 'HR', sort_order: 2 },
  { id: '3', name: 'مالی و حسابداری', code: 'FIN', sort_order: 3 },
  { id: '4', name: 'فروش و بازاریابی', code: 'SALES', sort_order: 4 },
  { id: '5', name: 'پشتیبانی و خدمات پس از فروش', code: 'SUP', sort_order: 5 },
  { id: '6', name: 'تضمین کیفیت و تحقیق و توسعه', code: 'RD', sort_order: 6 },
  { id: '7', name: 'حراست و انتظامات', code: 'SEC', sort_order: 7 },
  { id: '8', name: 'روابط عمومی و امور بین‌الملل', code: 'PR', sort_order: 8 },
];

let contacts: any[] = [
  {
    id: 1,
    personnel_code: '1001',
    prefix_title: 'mr',
    first_name: 'فرزاد',
    last_name: 'اکبری',
    job_title: 'مدیر فناوری اطلاعات و شبکه',
    department: 'فناوری اطلاعات و ارتباطات',
    location: 'ساختمان مرکزی - طبقه ۳ - اتاق ۳۰۱',
    mobiles: ['09121112233'],
    is_mobile_public: true,
    personal_mobiles: {},
    landlines: [
      { id: '1', phone: '02188001122', extension: '101', title: 'داخلی مستقیم' },
      { id: '2', phone: '02188001123', extension: '102', title: 'خط پشتیبانی' },
    ],
    email: 'f.akbari@parszarasa.local',
    description: 'مسئول زیرساخت‌های سرور، دامین کنترلرها و امنیت شبکه',
    avatar: '',
    contact_type: 'internal',
    domain: 'parszarasa.local',
    domain_id: '1',
    domain_name: 'دامین مرکزی (پارس زرآسا)',
    is_favorite: true,
    is_public: true,
    has_ldap_account: true,
    ldap_username: 'f.akbari',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    personnel_code: '1002',
    prefix_title: 'mr',
    first_name: 'علیرضا',
    last_name: 'رضایی',
    job_title: 'کارشناس ارشد لینوکس و ویپ (VoIP)',
    department: 'فناوری اطلاعات و ارتباطات',
    location: 'ساختمان مرکزی - طبقه ۳ - اتاق ۳۰۲',
    mobiles: ['09123334455'],
    is_mobile_public: true,
    personal_mobiles: {},
    landlines: [{ id: '1', phone: '', extension: '102', title: 'داخلی فنی' }],
    email: 'a.rezaei@parszarasa.local',
    description: 'مدیریت سرورهای استریسک، ایزابل و خطوط سیپ‌ترانک',
    avatar: '',
    contact_type: 'internal',
    domain: 'parszarasa.local',
    domain_id: '1',
    domain_name: 'دامین مرکزی (پارس زرآسا)',
    is_favorite: true,
    is_public: true,
    has_ldap_account: true,
    ldap_username: 'a.rezaei',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    personnel_code: '2001',
    prefix_title: 'ms',
    first_name: 'سارا',
    last_name: 'محمدی',
    job_title: 'مدیر منابع انسانی',
    department: 'مدیریت و منابع انسانی',
    location: 'ساختمان مرکزی - طبقه ۲ - اتاق ۲۰۱',
    mobiles: ['09125556677'],
    is_mobile_public: true,
    personal_mobiles: {},
    landlines: [{ id: '1', phone: '', extension: '201', title: 'داخلی اداری' }],
    email: 's.mohammadi@parszarasa.local',
    description: 'امور کارکنان، قراردادها و رفاهی',
    avatar: '',
    contact_type: 'internal',
    domain: 'parszarasa.local',
    domain_id: '1',
    domain_name: 'دامین مرکزی (پارس زرآسا)',
    is_favorite: true,
    is_public: true,
    has_ldap_account: true,
    ldap_username: 's.mohammadi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    personnel_code: '3001',
    prefix_title: 'mr',
    first_name: 'مهدی',
    last_name: 'احمدی',
    job_title: 'سرپرست حسابداری',
    department: 'مالی و حسابداری',
    location: 'ساختمان مرکزی - طبقه ۱ - اتاق ۱۰۵',
    mobiles: ['09127778899'],
    is_mobile_public: true,
    personal_mobiles: {},
    landlines: [{ id: '1', phone: '', extension: '301', title: 'داخلی حسابداری' }],
    email: 'm.ahmadi@parszarasa.local',
    description: 'رسیدگی به اسناد مالی و حقوق و دستمزد',
    avatar: '',
    contact_type: 'internal',
    domain: 'parszarasa.local',
    domain_id: '1',
    domain_name: 'دامین مرکزی (پارس زرآسا)',
    is_favorite: false,
    is_public: true,
    has_ldap_account: true,
    ldap_username: 'm.ahmadi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    personnel_code: '4001',
    prefix_title: 'ms',
    first_name: 'مریم',
    last_name: 'کریمی',
    job_title: 'کارشناس فروش سازمانی',
    department: 'فروش و بازاریابی',
    location: 'ساختمان تجاری - طبقه همکف',
    mobiles: ['09129990011'],
    is_mobile_public: true,
    personal_mobiles: {},
    landlines: [{ id: '1', phone: '', extension: '401', title: 'داخلی فروش' }],
    email: 'm.karimi@parszarasa.local',
    description: 'روابط با مشتریان کلان و عقد قراردادهای فروش',
    avatar: '',
    contact_type: 'internal',
    domain: 'parszarasa.local',
    domain_id: '1',
    domain_name: 'دامین مرکزی (پارس زرآسا)',
    is_favorite: false,
    is_public: true,
    has_ldap_account: true,
    ldap_username: 'm.karimi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    prefix_title: 'location',
    first_name: 'پشتیبانی فیبر نوری و پهنای باند',
    last_name: 'مخابرات',
    job_title: 'پشتیبانی ۲۴ ساعته خطوط دیتا',
    company_name: 'شرکت ارتباطات زیرساخت / مخابرات',
    department: 'فناوری اطلاعات و ارتباطات',
    location: 'مرکز عملیات شبکه',
    mobiles: ['09990001122'],
    is_mobile_public: true,
    personal_mobiles: {},
    landlines: [
      { id: '1', phone: '2020', extension: '', title: 'مرکز تماس مخابرات' },
      { id: '2', phone: '02188888888', extension: '', title: 'پشتیبانی اختصاصی' },
    ],
    email: 'noc@telecom.ir',
    description: 'تماس اضطراری در زمان قطعی اینترنت و فیبر نوری مجتمع',
    avatar: '',
    contact_type: 'external',
    domain: '',
    domain_id: '',
    domain_name: '',
    is_favorite: true,
    is_public: true,
    has_ldap_account: false,
    ldap_username: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let nextContactId = 100;
let nextDepartmentId = 20;

export function createApiMiddleware() {
  const router = express.Router();
  router.use(express.json({ limit: '15mb' }));

  // Health
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Contacts CRUD
  router.get('/contacts', (req, res) => {
    let list = [...contacts];
    const { department, search } = req.query;
    const authUserId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : null;
    const userRole = req.headers['x-user-role'] ? String(req.headers['x-user-role']) : null;
    const isAdmin = userRole === 'admin';

    // Role-based visibility for contacts
    if (!authUserId) {
      list = list.filter((c) => c.is_public !== false);
    } else if (!isAdmin) {
      list = list.filter((c) => c.is_public !== false || c.created_by_user_id === authUserId);
    }

    if (department && department !== 'all') {
      list = list.filter((c) => c.department === department);
    }

    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.first_name && c.first_name.toLowerCase().includes(s)) ||
          (c.last_name && c.last_name.toLowerCase().includes(s)) ||
          (c.job_title && c.job_title.toLowerCase().includes(s)) ||
          (c.personnel_code && c.personnel_code.toLowerCase().includes(s)) ||
          (c.location && c.location.toLowerCase().includes(s)) ||
          (c.company_name && c.company_name.toLowerCase().includes(s))
      );
    }

    // Confidential / Admin-Only lines are hidden for non-admins and guests
    const sanitized = list.map((c) => ({
      ...c,
      landlines: isAdmin
        ? (c.landlines || [])
        : (c.landlines || []).filter((l: any) => !l.is_admin_only && !l.is_confidential && !l.is_private && !l.admin_only),
    }));

    res.json(sanitized);
  });

  router.post('/contacts', (req, res) => {
    const data = req.body;
    const newId = data.id && typeof data.id === 'number' && data.id < 1000000 ? data.id : nextContactId++;
    
    // Resolve domain info
    const domId = data.domain_id || data.domain;
    const matchedDom = ldapDomains.find(
      (d) => String(d.id) === String(domId) || d.name?.toLowerCase() === String(domId).toLowerCase()
    );

    const creatorId = data.created_by_user_id !== undefined && data.created_by_user_id !== null && data.created_by_user_id !== 0
      ? Number(data.created_by_user_id)
      : (req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1);
    const creatorName = data.created_by_user_name || 'کاربر سیستم';

    const userRole = req.headers['x-user-role'] ? String(req.headers['x-user-role']) : null;
    const isAdmin = userRole === 'admin';
    const isPublic = isAdmin ? (data.is_public !== undefined ? Boolean(data.is_public) : true) : false;
    const isMobilePublic = isAdmin && isPublic ? Boolean(data.is_mobile_public) : false;

    const newContact = {
      ...data,
      id: newId,
      created_by_user_id: creatorId,
      created_by_user_name: creatorName,
      domain: matchedDom ? matchedDom.name : (data.domain || ''),
      domain_id: matchedDom ? String(matchedDom.id) : (data.domain_id ? String(data.domain_id) : ''),
      domain_name: matchedDom ? matchedDom.display_name : (data.domain_name || ''),
      is_favorite: Boolean(data.is_favorite),
      is_public: isPublic,
      is_mobile_public: isMobilePublic,
      personal_mobiles: data.personal_mobiles && typeof data.personal_mobiles === 'object' ? data.personal_mobiles : {},
      mobiles: Array.isArray(data.mobiles) ? data.mobiles : [],
      landlines: Array.isArray(data.landlines) ? data.landlines : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    contacts.unshift(newContact);
    res.status(201).json({ status: 'success', data: newContact, message: 'مخاطب جدید ذخیره شد.' });
  });

  router.get('/contacts/:id', (req, res) => {
    const id = req.params.id;
    const contact = contacts.find((c) => String(c.id) === String(id));
    if (!contact) {
      return res.status(404).json({ error: 'مخاطب یافت نشد.' });
    }
    const userRole = req.headers['x-user-role'] ? String(req.headers['x-user-role']) : null;
    const isAdmin = userRole === 'admin';
    const sanitized = {
      ...contact,
      landlines: isAdmin
        ? (contact.landlines || [])
        : (contact.landlines || []).filter((l: any) => !l.is_admin_only && !l.is_confidential && !l.is_private && !l.admin_only),
    };
    res.json(sanitized);
  });

  router.put('/contacts/:id', (req, res) => {
    const id = req.params.id;
    const index = contacts.findIndex((c) => String(c.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ error: 'مخاطب یافت نشد.' });
    }

    const data = req.body;
    const domId = data.domain_id || data.domain;
    const matchedDom = domId
      ? ldapDomains.find(
          (d) => String(d.id) === String(domId) || d.name?.toLowerCase() === String(domId).toLowerCase()
        )
      : null;

    const userRole = req.headers['x-user-role'] ? String(req.headers['x-user-role']) : null;
    const isAdmin = userRole === 'admin';

    const existingCreatorId = contacts[index].created_by_user_id;
    const creatorId = data.created_by_user_id !== undefined && data.created_by_user_id !== null && data.created_by_user_id !== 0
      ? Number(data.created_by_user_id)
      : (existingCreatorId ?? (req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1));

    const creatorName = data.created_by_user_name || contacts[index].created_by_user_name || 'کاربر سیستم';

    // حفظ وضعیت عمومی بودن مخاطب برای کاربر غیر ادمین
    const isPublic = isAdmin
      ? (data.is_public !== undefined ? Boolean(data.is_public) : contacts[index].is_public)
      : contacts[index].is_public;

    const isMobilePublic = isAdmin && isPublic
      ? (data.is_mobile_public !== undefined ? Boolean(data.is_mobile_public) : contacts[index].is_mobile_public)
      : contacts[index].is_mobile_public;

    const mergedPersonalMobiles = data.personal_mobiles !== undefined && typeof data.personal_mobiles === 'object'
      ? { ...(contacts[index].personal_mobiles || {}), ...data.personal_mobiles }
      : (contacts[index].personal_mobiles || {});

    const updated = {
      ...contacts[index],
      ...data,
      id: contacts[index].id,
      created_by_user_id: creatorId,
      created_by_user_name: creatorName,
      is_public: isPublic,
      is_mobile_public: isMobilePublic,
      personal_mobiles: mergedPersonalMobiles,
      domain: matchedDom ? matchedDom.name : (data.domain ?? contacts[index].domain),
      domain_id: matchedDom ? String(matchedDom.id) : (data.domain_id ? String(data.domain_id) : contacts[index].domain_id),
      domain_name: matchedDom ? matchedDom.display_name : (data.domain_name ?? contacts[index].domain_name),
      updated_at: new Date().toISOString(),
    };
    contacts[index] = updated;
    res.json({ status: 'success', data: updated, message: 'اطلاعات مخاطب به‌روزرسانی شد.' });
  });

  // ثبت و به‌روزرسانی اختصاصی شماره‌های همراه در دفترچه تلفن شخصی کاربر (Personal Overlay)
  router.post('/contacts/:id/personal-mobiles', (req, res) => {
    const id = req.params.id;
    const index = contacts.findIndex((c) => String(c.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ error: 'مخاطب یافت نشد.' });
    }

    const incoming = req.body.personal_mobiles;
    if (incoming && typeof incoming === 'object') {
      const current = { ...(contacts[index].personal_mobiles || {}) };
      for (const [k, v] of Object.entries(incoming)) {
        if (Array.isArray(v)) {
          current[String(k)] = Array.from(new Set(v.filter((x: any) => typeof x === 'string' && x.trim().length > 0)));
        }
      }
      contacts[index].personal_mobiles = current;
    }
    contacts[index].updated_at = new Date().toISOString();
    res.json({
      status: 'success',
      data: contacts[index],
      message: 'شماره‌های دفترچه تلفن شخصی با موفقیت در دیتابیس ثبت شد.',
    });
  });

  router.delete('/contacts/:id', (req, res) => {
    const id = req.params.id;
    contacts = contacts.filter((c) => String(c.id) !== String(id));
    res.json({ status: 'success', message: 'مخاطب با موفقیت حذف گردید.' });
  });

  router.post('/contacts/:id/favorite', (req, res) => {
    const id = req.params.id;
    const contact = contacts.find((c) => String(c.id) === String(id));
    if (!contact) {
      return res.status(404).json({ error: 'مخاطب یافت نشد.' });
    }
    contact.is_favorite = !contact.is_favorite;
    res.json({
      status: 'success',
      contact_id: id,
      is_favorite: contact.is_favorite,
      message: contact.is_favorite ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.',
    });
  });

  // Domains
  router.get('/domains', (req, res) => {
    const activeDomains = ldapDomains.filter((d) => d.is_active);
    res.json(activeDomains);
  });

  router.get('/admin/domains', (req, res) => {
    res.json({ status: 'success', data: ldapDomains });
  });

  router.post('/domains/sync', (req, res) => {
    const incoming = req.body.domains;
    if (Array.isArray(incoming)) {
      ldapDomains = incoming.map((d, idx) => ({
        ...d,
        id: d.id ? String(d.id) : String(idx + 1),
        is_active: d.is_active !== undefined ? Boolean(d.is_active) : true,
      }));
    }
    res.json({ status: 'success', message: 'دامین‌ها با موفقیت ذخیره شدند.' });
  });

  router.post('/domains/test-ldap', (req, res) => {
    const { host, port } = req.body;
    res.json({
      status: 'success',
      message: `اتصال آزمایشی به دامین کنترلر ${host || 'دامین سازمانی'}:${port || 389} با موفقیت برقرار شد.`,
      latencyMs: 18 + Math.floor(Math.random() * 20),
    });
  });

  // Departments
  router.get('/departments', (req, res) => {
    const enriched = departments.map((dept) => {
      if (dept.id === 'all') return dept;
      const matchedDomain = ldapDomains.find(
        (d) => String(d.id) === String(dept.domain_id) || d.name === dept.domain_id
      );
      return {
        ...dept,
        domain_name: dept.domain_name || matchedDomain?.display_name || matchedDomain?.name,
      };
    });
    res.json(enriched);
  });

  router.post('/departments', (req, res) => {
    const { name, code, domain_id, sort_order } = req.body;
    if (!name) {
      return res.status(422).json({ message: 'نام واحد الزامی است.' });
    }
    const matchedDomain = ldapDomains.find(
      (d) => String(d.id) === String(domain_id) || d.name === domain_id
    );
    const newDept = {
      id: String(nextDepartmentId++),
      name,
      code: code || '',
      domain_id: domain_id ? String(domain_id) : undefined,
      domain_name: matchedDomain?.display_name || matchedDomain?.name,
      sort_order: sort_order || departments.length,
    };
    departments.push(newDept);
    res.status(201).json(newDept);
  });

  router.put('/departments/:id', (req, res) => {
    const { id } = req.params;
    const index = departments.findIndex((d) => String(d.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ message: 'واحد سازمانی یافت نشد.' });
    }
    const domain_id = req.body.domain_id;
    const matchedDomain = ldapDomains.find(
      (d) => String(d.id) === String(domain_id) || d.name === domain_id
    );
    departments[index] = {
      ...departments[index],
      ...req.body,
      id,
      domain_name: matchedDomain?.display_name || matchedDomain?.name || req.body.domain_name,
    };
    res.json(departments[index]);
  });

  router.delete('/departments/:id', (req, res) => {
    const { id } = req.params;
    departments = departments.filter((d) => String(d.id) !== String(id));
    res.json({ message: 'واحد سازمانی با موفقیت حذف شد.' });
  });

  router.post('/departments/sync', (req, res) => {
    const incoming = req.body.departments;
    if (Array.isArray(incoming)) {
      const enrichedIncoming = incoming.map((item: any, idx: number) => {
        let validId = item.id;
        if (!validId || String(validId).startsWith('dept-')) {
          validId = String(nextDepartmentId++);
        }
        const matchedDomain = ldapDomains.find(
          (d) => String(d.id) === String(item.domain_id) || d.name === item.domain_id
        );
        return {
          ...item,
          id: String(validId),
          sort_order: typeof item.sort_order === 'number' ? item.sort_order : idx + 1,
          domain_id: item.domain_id ? String(item.domain_id) : undefined,
          domain_name: item.domain_name || matchedDomain?.display_name || matchedDomain?.name,
        };
      });

      const hasAll = enrichedIncoming.some((d: any) => d.id === 'all');
      departments = hasAll
        ? enrichedIncoming
        : [{ id: 'all', name: 'تمام واحدها', code: 'ALL', sort_order: 0 }, ...enrichedIncoming];
    }
    res.json({ message: 'واحدهای سازمانی با موفقیت همگام‌سازی شدند.', data: departments });
  });

  // Login
  router.post('/login/ldap', (req, res) => {
    const { username, password, domain_name } = req.body;
    if (!username || !password) {
      return res.status(422).json({ status: 'error', message: 'نام کاربری و رمز عبور الزامی است.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const adminUsers = (process.env.ADMIN_LDAP_USERS || 'admin,f.akbari,administrator')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim());
    const isAdmin = cleanUser === 'admin' || adminUsers.includes(cleanUser);

    const matchedContact = contacts.find(
      (c) =>
        (c.ldap_username && c.ldap_username.toLowerCase() === cleanUser) ||
        (c.email && c.email.toLowerCase().startsWith(cleanUser))
    );

    const displayName =
      cleanUser === 'admin'
        ? 'مدیر ارشد سامانه'
        : matchedContact
        ? `${matchedContact.first_name} ${matchedContact.last_name}`.trim()
        : username;

    const department = matchedContact?.department || (isAdmin ? 'فناوری اطلاعات و ارتباطات' : 'پرسنل سازمانی');
    const extension = matchedContact?.landlines?.[0]?.extension || matchedContact?.landlines?.[0]?.number || (isAdmin ? '101' : '');

    return res.json({
      status: 'success',
      token: `token-${cleanUser}-${Date.now()}`,
      user: {
        id: matchedContact ? matchedContact.id : isAdmin ? 1 : 99,
        name: displayName,
        username: cleanUser,
        email: `${cleanUser}@parszarasa.local`,
        personnel_code: matchedContact?.personnel_code || '00001',
        role: isAdmin ? 'admin' : 'staff',
        department,
        domain: domain_name || 'parszarasa.local',
        domain_name: domain_name || 'parszarasa.local',
        domain_display_name: 'دامین مرکزی (پارس زرآسا)',
        auth_method: cleanUser === 'admin' ? 'local' : 'ldap',
        extension,
      },
    });
  });

  // VoIP
  router.post('/voip/originate', (req, res) => {
    const { target_number } = req.body;
    res.json({
      success: true,
      message: `دستور تماس به سرور ایزابل ارسال شد. تلفن رومیزی در حال زنگ خوردن است. به محض پاسخ، تماس با شماره ${target_number} برقرار خواهد شد.`,
      callId: `call-${Date.now()}`,
    });
  });

  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use('/webapp/smartcontact/api', router);
  app.use('/api', router);

  return app;
}
