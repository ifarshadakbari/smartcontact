<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\DepartmentController;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| ۱. روت‌های دفترچه تلفن (مخاطبین)
|--------------------------------------------------------------------------
*/
// روت نشان‌شده‌ها (Toggle Favorite) با پشتیبانی از Sanctum یا تشخیص هویت هدر
Route::post('/contacts/{contact}/favorite', [ContactController::class, 'favorite']);
Route::post('/contacts/{contact}/personal-mobiles', [ContactController::class, 'updatePersonalMobiles']);

// روت‌های اصلی مدیریت مخاطبین
Route::get('/contacts', [ContactController::class, 'index']);
Route::post('/contacts', [ContactController::class, 'store']);
Route::post('/contacts/reorder', [ContactController::class, 'reorder']);
Route::get('/contacts/{contact}', [ContactController::class, 'show']);
Route::put('/contacts/{contact}', [ContactController::class, 'update']);
Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);

/*
|--------------------------------------------------------------------------
| ۲. دریافت دامنه‌های LDAP مستقیماً از جدول دیتابیس
|--------------------------------------------------------------------------
*/
Route::get('/domains', function () {
    try {
        if (\Illuminate\Support\Facades\Schema::hasTable('ldap_domains')) {
            $domains = DB::table('ldap_domains')->where('is_active', true)->get();
            return response()->json($domains);
        }
        return response()->json([]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

/*
|--------------------------------------------------------------------------
| ۳. روت اختصاصی ادمین (دریافت تمام فیلدهای دامین)
|--------------------------------------------------------------------------
*/
Route::get('/admin/domains', function () {
    try {
        if (\Illuminate\Support\Facades\Schema::hasTable('ldap_domains')) {
            $domains = DB::table('ldap_domains')->get();
            return response()->json(['status' => 'success', 'data' => $domains]);
        }
        return response()->json(['status' => 'success', 'data' => []]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

/*
|--------------------------------------------------------------------------
| ۴. ذخیره و همگام‌سازی دامنه‌ها در دیتابیس
|--------------------------------------------------------------------------
*/
Route::post('/domains/sync', function (Request $request) {
    try {
        $domains = $request->input('domains', []);
        
        foreach ($domains as $d) {
            $name = trim($d['name'] ?? '');
            if (empty($name)) continue;

            $existing = DB::table('ldap_domains')->where('name', $name)->first();

            $data = [
                'name'              => $name,
                'display_name'      => !empty($d['display_name']) ? $d['display_name'] : ($existing->display_name ?? $name),
                'host'              => !empty($d['host']) ? $d['host'] : ($existing->host ?? ''),
                'port'              => !empty($d['port']) ? (int)$d['port'] : ($existing->port ?? 389),
                'base_dn'           => !empty($d['base_dn']) ? $d['base_dn'] : ($existing->base_dn ?? ''),
                'encryption'        => !empty($d['encryption']) ? $d['encryption'] : ($existing->encryption ?? 'none'),
                'bind_user'         => isset($d['bind_user']) && $d['bind_user'] !== '' ? $d['bind_user'] : ($existing->bind_user ?? null),
                'user_filter'       => !empty($d['user_filter']) ? $d['user_filter'] : ($existing->user_filter ?? null),
                'is_default'        => !empty($d['is_default']),
                'is_active'         => isset($d['is_active']) ? (bool)$d['is_active'] : true,
                'voip_enabled'      => !empty($d['voip_enabled']),
                'voip_server_host'  => !empty($d['voip_server_host']) ? $d['voip_server_host'] : ($existing->voip_server_host ?? null),
                'voip_ami_port'     => !empty($d['voip_ami_port']) ? (int)$d['voip_ami_port'] : ($existing->voip_ami_port ?? 5038),
                'voip_ami_username' => !empty($d['voip_ami_username']) ? $d['voip_ami_username'] : ($existing->voip_ami_username ?? null),
                'voip_context'      => !empty($d['voip_context']) ? $d['voip_context'] : ($existing->voip_context ?? 'from-internal'),
                'voip_channel_tech' => !empty($d['voip_channel_tech']) ? $d['voip_channel_tech'] : ($existing->voip_channel_tech ?? 'SIP'),
                'updated_at'        => now(),
            ];

            if (!empty($d['bind_password'])) {
                $data['bind_password'] = $d['bind_password'];
            }
            if (!empty($d['voip_ami_secret'])) {
                $data['voip_ami_secret'] = $d['voip_ami_secret'];
            }

            if ($existing) {
                DB::table('ldap_domains')->where('id', $existing->id)->update($data);
            } else {
                $data['created_at'] = now();
                DB::table('ldap_domains')->insert($data);
            }
        }

        return response()->json(['status' => 'success', 'message' => 'دامین‌ها با موفقیت ذخیره شدند.']);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

/*
|--------------------------------------------------------------------------
| ۵. تست ارتباط واقعی با سرور اکتیودایرکتوری (پورت و سوکت شبکه)
|--------------------------------------------------------------------------
*/
Route::post('/domains/test-ldap', function (Request $request) {
    $host = trim($request->input('host', ''));
    $port = (int)$request->input('port', 389);
    $encryption = $request->input('encryption', 'none');
    $bindUser = $request->input('bind_user', null);
    $bindPassword = $request->input('bind_password', null);

    if (empty($host)) {
        return response()->json(['status' => 'error', 'message' => 'آدرس هاست یا IP دامین کنترلر الزامی است.'], 422);
    }

    $startTime = microtime(true);
    $connectionTimeout = 3;
    $fp = @fsockopen($host, $port, $errno, $errstr, $connectionTimeout);
    if (!$fp) {
        $latency = round((microtime(true) - $startTime) * 1000);
        return response()->json([
            'status' => 'error',
            'message' => "عدم برقراری ارتباط شبکه با {$host}:{$port} - علت: {$errstr}",
            'latencyMs' => $latency
        ], 500);
    }
    fclose($fp);

    if (function_exists('ldap_connect')) {
        $ldapUri = ($encryption === 'ssl' || $port === 636) ? "ldaps://{$host}:{$port}" : "ldap://{$host}:{$port}";
        $ldapConn = @ldap_connect($ldapUri);

        if ($ldapConn) {
            ldap_set_option($ldapConn, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ldapConn, LDAP_OPT_REFERRALS, 0);
            ldap_set_option($ldapConn, LDAP_OPT_NETWORK_TIMEOUT, 3);

            if ($encryption === 'tls') {
                @ldap_start_tls($ldapConn);
            }

            if (!empty($bindUser) && !empty($bindPassword)) {
                $bind = @ldap_bind($ldapConn, $bindUser, $bindPassword);
                $latency = round((microtime(true) - $startTime) * 1000);
                if (!$bind) {
                    $ldapError = ldap_error($ldapConn);
                    return response()->json([
                        'status' => 'error',
                        'message' => "اتصال شبکه برقرار است اما اعتبار Bind DN ناموفق بود: {$ldapError}",
                        'latencyMs' => $latency
                    ], 401);
                }
            }
            @ldap_close($ldapConn);
        }
    }

    $latency = round((microtime(true) - $startTime) * 1000);
    return response()->json([
        'status' => 'success',
        'message' => "اتصال به دامین کنترلر {$host}:{$port} با موفقیت برقرار شد.",
        'latencyMs' => $latency
    ]);
});

/*
|--------------------------------------------------------------------------
| ۶. احراز هویت و ورود کاربران بر اساس دامین انتخابی (LDAP Login)
|--------------------------------------------------------------------------
*/
Route::post('/login/ldap', function (Request $request) {
    try {
        $username = trim($request->input('username', ''));
        $password = $request->input('password', '');
        $domainId = $request->input('domain_id');
        $domainName = trim($request->input('domain_name', ''));

        if (empty($username) || empty($password)) {
            return response()->json(['status' => 'error', 'message' => 'نام کاربری و رمز عبور الزامی است.'], 422);
        }

        // بررسی لاگین اضطراری ادمین لوکال
        if ($username === 'admin' && $password === 'admin') {
            $user = User::firstOrCreate(
                ['email' => 'admin@parszarasa.local'],
                [
                    'name'     => 'مدیر ارشد سامانه',
                    'username' => 'admin',
                    'password' => bcrypt('admin'),
                    'role'     => 'admin',
                ]
            );
            if (empty($user->username)) {
                $user->username = 'admin';
                $user->save();
            }

            $token = method_exists($user, 'createToken') 
                ? $user->createToken('auth-token')->plainTextToken 
                : bin2hex(random_bytes(32));

            return response()->json([
                'status' => 'success',
                'token'  => $token,
                'user'   => [
                    'id'             => $user->id,
                    'name'           => 'مدیر ارشد سامانه',
                    'username'       => 'admin',
                    'email'          => 'admin@parszarasa.local',
                    'personnel_code' => '00001',
                    'role'           => 'admin',
                    'department'     => 'فناوری اطلاعات',
                    'domain'         => 'Local',
                    'domain_name'    => 'Local',
                    'auth_method'    => 'local',
                    'extension'      => '',
                ]
            ]);
        }

        $domain = null;
        if (!empty($domainId)) {
            $domain = DB::table('ldap_domains')->where('id', $domainId)->first();
        }
        if (!$domain && !empty($domainName)) {
            $domain = DB::table('ldap_domains')->where('name', $domainName)->first();
        }
        if (!$domain) {
            $domain = DB::table('ldap_domains')->where('is_default', true)->first() ?: DB::table('ldap_domains')->first();
        }

        if (!$domain) {
            return response()->json(['status' => 'error', 'message' => 'هیچ دامین فعالی در سیستم یافت نشد.'], 404);
        }

        $ldapHost = $domain->host;
        $ldapPort = (int)($domain->port ?: 389);
        $ldapDomain = $domain->name;
        $baseDn = $domain->base_dn ?: 'DC=parszarasa,DC=local';

        if (!function_exists('ldap_connect')) {
            return response()->json(['status' => 'error', 'message' => 'اکستنشن php-ldap روی سرور فعال نیست.'], 500);
        }

        $ldapConn = @ldap_connect($ldapHost, $ldapPort);
        if (!$ldapConn) {
            return response()->json(['status' => 'error', 'message' => "امکان اتصال به سرور دامین {$ldapHost} وجود ندارد."], 500);
        }

        ldap_set_option($ldapConn, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($ldapConn, LDAP_OPT_REFERRALS, 0);
        ldap_set_option($ldapConn, LDAP_OPT_NETWORK_TIMEOUT, 5);

        $bindSuccessful = false;
        $cleanUsername = str_contains($username, '@') ? explode('@', $username)[0] : $username;
        if (str_contains($cleanUsername, '\\')) {
            $cleanUsername = explode('\\', $cleanUsername)[1];
        }

        $upn = $cleanUsername . '@' . $ldapDomain;
        if (@ldap_bind($ldapConn, $upn, $password)) {
            $bindSuccessful = true;
        }

        if (!$bindSuccessful) {
            $netbios = explode('.', $ldapDomain)[0];
            $downLevelLogon = $netbios . '\\' . $cleanUsername;
            if (@ldap_bind($ldapConn, $downLevelLogon, $password)) {
                $bindSuccessful = true;
            }
        }

        if (!$bindSuccessful && !empty($domain->bind_user) && !empty($domain->bind_password)) {
            $adminBind = @ldap_bind($ldapConn, $domain->bind_user, $domain->bind_password);
            if ($adminBind) {
                $filter = "(&(objectClass=user)(|(sAMAccountName=" . ldap_escape($cleanUsername, '', LDAP_ESCAPE_FILTER) . ")(userPrincipalName=" . ldap_escape($upn, '', LDAP_ESCAPE_FILTER) . ")))";
                $search = @ldap_search($ldapConn, $baseDn, $filter, ['dn']);
                if ($search) {
                    $entries = @ldap_get_entries($ldapConn, $search);
                    if ($entries && $entries['count'] > 0) {
                        $userDn = $entries[0]['dn'];
                        if (@ldap_bind($ldapConn, $userDn, $password)) {
                            $bindSuccessful = true;
                        }
                    }
                }
            }
        }

        if (!$bindSuccessful) {
            @ldap_close($ldapConn);
            return response()->json([
                'status'  => 'error',
                'message' => "نام کاربری یا کلمه عبور در دامین «{$domain->display_name}» نادرست است."
            ], 401);
        }

        $displayName = $cleanUsername;
        $department  = 'پرسنل سازمانی';
        $extension   = '';
        $email       = strtolower($cleanUsername) . '@' . strtolower($ldapDomain);

        $filter = "(&(objectClass=user)(|(sAMAccountName=" . ldap_escape($cleanUsername, '', LDAP_ESCAPE_FILTER) . ")(userPrincipalName=" . ldap_escape($upn, '', LDAP_ESCAPE_FILTER) . ")))";
        $attributes = ['displayName', 'givenName', 'sn', 'department', 'ipPhone', 'ipphone', 'otherIpPhone', 'telephoneNumber', 'mail'];
        $search = @ldap_search($ldapConn, $baseDn, $filter, $attributes);

        if ($search) {
            $entries = @ldap_get_entries($ldapConn, $search);
            if ($entries && $entries['count'] > 0) {
                $u = $entries[0];
                if (!empty($u['displayname'][0])) {
                    $displayName = $u['displayname'][0];
                } elseif (!empty($u['givenname'][0]) && !empty($u['sn'][0])) {
                    $displayName = $u['givenname'][0] . ' ' . $u['sn'][0];
                }
                if (!empty($u['department'][0])) {
                    $department = $u['department'][0];
                }
                if (!empty($u['ipphone'][0])) {
                    $extension = trim($u['ipphone'][0]);
                } elseif (!empty($u['otheripphone'][0])) {
                    $extension = trim($u['otheripphone'][0]);
                } elseif (!empty($u['telephonenumber'][0])) {
                    $extension = trim($u['telephonenumber'][0]);
                }
                if (!empty($u['mail'][0])) {
                    $email = $u['mail'][0];
                }
            }
        }

        @ldap_close($ldapConn);

        $adminUsers = env('ADMIN_LDAP_USERS', 'admin,administrator,sarrafi,f.akbari');
        $adminList = array_map('trim', array_map('strtolower', explode(',', $adminUsers)));
        $isAdmin = in_array(strtolower($cleanUsername), $adminList);
        $resolvedRole = $isAdmin ? 'admin' : 'staff';

        // ثبت یا همگام‌سازی در جدول users دیتابیس تا جدول contact_favorites به شناسه واقعی کاربر متصل شود
        $dbUser = User::where('email', $email)
            ->orWhere('username', $cleanUsername)
            ->first();

        if (!$dbUser) {
            $dbUser = User::create([
                'name'     => $displayName,
                'username' => $cleanUsername,
                'email'    => $email,
                'password' => bcrypt(str_random(16)),
                'role'     => $resolvedRole,
            ]);
        } else {
            // به‌روزرسانی نقش و مشخصات کاربر لاگین‌شده بر اساس لیست ADMIN_LDAP_USERS
            $dbUser->role = $resolvedRole;
            $dbUser->username = $cleanUsername;
            if (!empty($displayName)) {
                $dbUser->name = $displayName;
            }
            $dbUser->save();
        }

        // صدور توکن Sanctum یا توکن تصادفی در صورت عدم استفاده از Sanctum
        $token = method_exists($dbUser, 'createToken')
            ? $dbUser->createToken('ldap-auth')->plainTextToken
            : bin2hex(random_bytes(32));

        return response()->json([
            'status' => 'success',
            'token'  => $token,
            'user'   => [
                'id'                  => $dbUser->id,
                'name'                => $displayName,
                'username'            => $cleanUsername,
                'email'               => $email,
                'personnel_code'      => '',
                'role'                => $isAdmin ? 'admin' : 'staff',
                'department'          => $department,
                'domain'              => $domain->name,
                'domain_name'         => $domain->name,
                'domain_display_name' => $domain->display_name ?? $domain->name,
                'auth_method'         => 'ldap',
                'extension'           => $extension,
            ]
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'status'  => 'error',
            'message' => 'خطای سرور در احراز هویت: ' . $e->getMessage()
        ], 500);
    }
});

/*
|--------------------------------------------------------------------------
| ۷. واحدهای سازمانی (Departments)
|--------------------------------------------------------------------------
*/
Route::get('/departments', [DepartmentController::class, 'index']);
Route::post('/departments', [DepartmentController::class, 'store']);
Route::put('/departments/{department}', [DepartmentController::class, 'update']);
Route::delete('/departments/{department}', [DepartmentController::class, 'destroy']);
Route::post('/departments/sync', [DepartmentController::class, 'sync']);