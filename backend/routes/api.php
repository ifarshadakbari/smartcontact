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
| ۴.۱. مدیریت و ذخیره پایدار دسترسی‌های مانیتورینگ BLF در دیتابیس
|--------------------------------------------------------------------------
*/
Route::get('/blf/permissions', function () {
    try {
        if (!\Illuminate\Support\Facades\Schema::hasTable('blf_permissions')) {
            \Illuminate\Support\Facades\Schema::create('blf_permissions', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique()->index();
                $table->string('user_name')->nullable();
                $table->string('department')->nullable();
                $table->string('domain_id', 50)->nullable();
                $table->string('domain_name')->nullable();
                $table->boolean('can_view_blf')->default(false);
                $table->boolean('can_view_all')->default(false);
                $table->json('monitored_extensions')->nullable();
                $table->json('extra_data')->nullable();
                $table->string('role', 30)->default('staff');
                $table->timestamps();
            });
        } elseif (!\Illuminate\Support\Facades\Schema::hasColumn('blf_permissions', 'extra_data')) {
            try {
                \Illuminate\Support\Facades\Schema::table('blf_permissions', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->json('extra_data')->nullable();
                });
            } catch (\Throwable $e) {}
        }

        $records = DB::table('blf_permissions')->get();
        $formatted = $records->map(function ($r) {
            $exts = [];
            if (!empty($r->monitored_extensions)) {
                $decoded = is_string($r->monitored_extensions) ? json_decode($r->monitored_extensions, true) : $r->monitored_extensions;
                if (is_array($decoded)) {
                    $exts = array_values(array_map('strval', $decoded));
                }
            }

            $extra = [];
            if (isset($r->extra_data) && !empty($r->extra_data)) {
                $extra = is_string($r->extra_data) ? json_decode($r->extra_data, true) : (array)$r->extra_data;
            }

            return array_merge([
                'userId' => (int)$r->user_id,
                'userName' => $r->user_name ?: 'کاربر سامانه',
                'department' => $r->department ?: '',
                'domainId' => $r->domain_id ?: '',
                'domainName' => $r->domain_name ?: '',
                'canViewBlf' => (bool)$r->can_view_blf,
                'canViewAll' => (bool)$r->can_view_all,
                'monitoredExtensions' => $exts,
                'role' => $r->role ?: 'staff',
            ], is_array($extra) ? $extra : []);
        });

        return response()->json([
            'status' => 'success',
            'data' => $formatted
        ]);
    } catch (\Throwable $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

Route::post('/blf/permissions', function (Request $request) {
    try {
        if (!\Illuminate\Support\Facades\Schema::hasTable('blf_permissions')) {
            \Illuminate\Support\Facades\Schema::create('blf_permissions', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique()->index();
                $table->string('user_name')->nullable();
                $table->string('department')->nullable();
                $table->string('domain_id', 50)->nullable();
                $table->string('domain_name')->nullable();
                $table->boolean('can_view_blf')->default(false);
                $table->boolean('can_view_all')->default(false);
                $table->json('monitored_extensions')->nullable();
                $table->json('extra_data')->nullable();
                $table->string('role', 30)->default('staff');
                $table->timestamps();
            });
        } elseif (!\Illuminate\Support\Facades\Schema::hasColumn('blf_permissions', 'extra_data')) {
            try {
                \Illuminate\Support\Facades\Schema::table('blf_permissions', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->json('extra_data')->nullable();
                });
            } catch (\Throwable $e) {}
        }

        $permissions = $request->input('permissions', []);
        if (!is_array($permissions)) {
            return response()->json(['status' => 'error', 'message' => 'داده‌های ارسالی نامعتبر است.'], 422);
        }

        $receivedUserIds = [];

        foreach ($permissions as $p) {
            $userId = isset($p['userId']) ? (int)$p['userId'] : (isset($p['user_id']) ? (int)$p['user_id'] : 0);
            if ($userId <= 0) continue;

            $receivedUserIds[] = $userId;
            $exts = isset($p['monitoredExtensions']) ? $p['monitoredExtensions'] : (isset($p['monitored_extensions']) ? $p['monitored_extensions'] : []);
            if (!is_array($exts)) $exts = [];
            $extsJson = json_encode(array_values(array_unique(array_map('strval', $exts))));

            $canViewBlf = isset($p['canViewBlf']) ? (bool)$p['canViewBlf'] : (isset($p['can_view_blf']) ? (bool)$p['can_view_blf'] : false);
            $canViewAll = isset($p['canViewAll']) ? (bool)$p['canViewAll'] : (isset($p['can_view_all']) ? (bool)$p['can_view_all'] : false);

            $extra = [
                'userUsername' => $p['userUsername'] ?? ($p['user_username'] ?? ''),
                'userEmail' => $p['userEmail'] ?? ($p['user_email'] ?? ''),
                'userExtension' => $p['userExtension'] ?? ($p['user_extension'] ?? ''),
                'personnelCode' => $p['personnelCode'] ?? ($p['personnel_code'] ?? ''),
                'contactId' => $p['contactId'] ?? ($p['contact_id'] ?? $userId),
            ];

            $data = [
                'user_name' => $p['userName'] ?? ($p['user_name'] ?? ''),
                'department' => $p['department'] ?? '',
                'domain_id' => $p['domainId'] ?? ($p['domain_id'] ?? ''),
                'domain_name' => $p['domainName'] ?? ($p['domain_name'] ?? ''),
                'can_view_blf' => $canViewBlf,
                'can_view_all' => $canViewAll,
                'monitored_extensions' => $extsJson,
                'role' => $p['role'] ?? 'staff',
                'updated_at' => now(),
            ];

            if (\Illuminate\Support\Facades\Schema::hasColumn('blf_permissions', 'extra_data')) {
                $data['extra_data'] = json_encode($extra);
            }

            $exists = DB::table('blf_permissions')->where('user_id', $userId)->first();
            if ($exists) {
                DB::table('blf_permissions')->where('user_id', $userId)->update($data);
            } else {
                $data['user_id'] = $userId;
                $data['created_at'] = now();
                DB::table('blf_permissions')->insert($data);
            }
        }

        // حذف کاربرانی که در لیست حذف شده‌اند (به جز کاربر ادمین)
        if (!empty($receivedUserIds)) {
            DB::table('blf_permissions')
                ->where('role', '!=', 'admin')
                ->whereNotIn('user_id', $receivedUserIds)
                ->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'سطوح دسترسی BLF پرسنل با موفقیت در دیتابیس ذخیره شد.'
        ]);
    } catch (\Throwable $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

/*
|--------------------------------------------------------------------------
| ۴.۳. استعلام بلادرنگ وضعیت خطوط و اشغالی تلفن‌ها (BLF / Asterisk AMI)
|--------------------------------------------------------------------------
*/
Route::match(['get', 'post'], '/blf/states', function (Request $request) {
    try {
        $domainId = $request->input('domain_id');
        $extensions = $request->input('extensions', []);
        if (!is_array($extensions)) {
            $extensions = !empty($extensions) ? explode(',', (string)$extensions) : [];
        }

        $cleanExts = [];
        foreach ($extensions as $ext) {
            $e = trim((string)$ext);
            if ($e !== '') {
                $cleanExts[] = $e;
            }
        }

        $host = trim($request->input('host', ''));
        $port = (int)$request->input('port', 5038);
        $username = trim($request->input('username', ''));
        $secret = $request->input('secret');
        $context = trim($request->input('context', 'from-internal'));

        // اگر اطلاعات هاست یا AMI ارسال نشده باشد، از دیتابیس لود می‌شود
        if (empty($host) || empty($username) || $secret === null || $secret === '') {
            $query = DB::table('ldap_domains');
            if (!empty($domainId)) {
                $query->where('id', $domainId);
            } else {
                $query->where('is_active', true)->orderByDesc('is_default');
            }
            $domainRecord = $query->first();
            if ($domainRecord) {
                if (empty($host)) $host = $domainRecord->voip_server_host ?? '';
                if (empty($port)) $port = (int)($domainRecord->voip_ami_port ?? 5038);
                if (empty($username)) $username = $domainRecord->voip_ami_username ?? '';
                if ($secret === null || $secret === '') $secret = $domainRecord->voip_ami_secret ?? '';
                if (empty($context)) $context = $domainRecord->voip_context ?? 'from-internal';
            }
        }

        $states = [];
        foreach ($cleanExts as $ext) {
            $states[$ext] = [
                'state' => 'idle',
                'durationSec' => 0,
                'callerNumber' => null,
            ];
        }

        $amiConnected = false;
        if (!empty($host) && !empty($username)) {
            $fp = @fsockopen($host, $port, $errno, $errstr, 2);
            if ($fp) {
                stream_set_timeout($fp, 3);
                @fgets($fp, 512); // Banner

                $loginPacket = "Action: Login\r\nUsername: {$username}\r\nSecret: {$secret}\r\n\r\n";
                fwrite($fp, $loginPacket);

                $loginOk = false;
                for ($i = 0; $i < 20 && !feof($fp); $i++) {
                    $line = fgets($fp, 512);
                    if ($line === false || trim($line) === '') break;
                    if (stripos($line, 'Response: Success') !== false || stripos($line, 'Authentication accepted') !== false) {
                        $loginOk = true;
                    }
                }

                if ($loginOk) {
                    $amiConnected = true;

                    // ۱. دستور استعلام تمامی هینت‌ها در استریسک / ایزابل (core show hints)
                    fwrite($fp, "Action: Command\r\nCommand: core show hints\r\n\r\n");
                    $hintsBuffer = '';
                    while (!feof($fp)) {
                        $line = fgets($fp, 1024);
                        if ($line === false) break;
                        $hintsBuffer .= $line;
                        if (str_contains($line, '--END COMMAND--')) break;
                    }

                    $hintLines = explode("\n", $hintsBuffer);
                    foreach ($hintLines as $hLine) {
                        if (preg_match('/^\s*([0-9a-zA-Z_-]+)@([^\s]+)\s*:\s*.*State:([A-Za-z0-9_-]+)/i', $hLine, $m)) {
                            $ext = trim($m[1]);
                            $rawSt = strtolower(trim($m[3]));

                            $mappedState = 'idle';
                            if (in_array($rawSt, ['inuse', 'busy', 'hold', 'onhold'])) {
                                $mappedState = 'busy';
                            } elseif (in_array($rawSt, ['ringing', 'ringinuse'])) {
                                $mappedState = 'busy';
                            } elseif (in_array($rawSt, ['unavailable', 'unknown', 'de-registered'])) {
                                $mappedState = 'offline';
                            }

                            if (isset($states[$ext]) || empty($cleanExts) || in_array($ext, $cleanExts)) {
                                $states[$ext] = [
                                    'state' => $mappedState,
                                    'durationSec' => $mappedState === 'busy' ? max($states[$ext]['durationSec'] ?? 0, 1) : 0,
                                    'callerNumber' => $states[$ext]['callerNumber'] ?? null,
                                ];
                            }
                        }
                    }

                    // ۲. دستور بررسی کانال‌های فعال و در حال مکالمه (core show channels concise)
                    fwrite($fp, "Action: Command\r\nCommand: core show channels concise\r\n\r\n");
                    $chanBuffer = '';
                    while (!feof($fp)) {
                        $line = fgets($fp, 1024);
                        if ($line === false) break;
                        $chanBuffer .= $line;
                        if (str_contains($line, '--END COMMAND--')) break;
                    }

                    $chanLines = explode("\n", $chanBuffer);
                    foreach ($chanLines as $cLine) {
                        $parts = explode('!', trim($cLine));
                        if (count($parts) >= 5) {
                            $channel = $parts[0];
                            $exten = $parts[2] ?? '';
                            $callerId = $parts[7] ?? '';
                            $duration = isset($parts[11]) ? (int)$parts[11] : 0;

                            if (preg_match('/^(?:SIP|PJSIP|IAX2|DAHDI|Local)\/([0-9a-zA-Z_-]+?)(?:-[0-9a-fA-F]+|\/.*)?$/', $channel, $cm)) {
                                $chExt = $cm[1];
                                $states[$chExt] = [
                                    'state' => 'busy',
                                    'durationSec' => max($duration, 1),
                                    'callerNumber' => $exten ?: $callerId,
                                ];
                            }

                            if (!empty($exten) && (isset($states[$exten]) || in_array($exten, $cleanExts))) {
                                $states[$exten] = [
                                    'state' => 'busy',
                                    'durationSec' => max($duration, 1),
                                    'callerNumber' => $callerId,
                                ];
                            }
                        }
                    }

                    // ۳. بررسی تکی وضعیت داخلی‌های اعلام‌شده از طریق ExtensionState برای اطمینان مضاعف
                    foreach ($cleanExts as $ext) {
                        if (!isset($states[$ext]) || $states[$ext]['state'] === 'idle') {
                            $extAction = "Action: ExtensionState\r\nExten: {$ext}\r\nContext: {$context}\r\nActionID: {$ext}\r\n\r\n";
                            fwrite($fp, $extAction);

                            $extResp = '';
                            while (!feof($fp)) {
                                $line = fgets($fp, 512);
                                if ($line === false || trim($line) === '') break;
                                $extResp .= $line;
                            }

                            if (preg_match('/Status:\s*(-?[0-9]+)/i', $extResp, $sm)) {
                                $statusCode = (int)$sm[1];
                                if (in_array($statusCode, [1, 2, 8, 9, 16])) {
                                    $states[$ext] = [
                                        'state' => 'busy',
                                        'durationSec' => max($states[$ext]['durationSec'] ?? 0, 1),
                                        'callerNumber' => null,
                                    ];
                                } elseif ($statusCode === 4 || $statusCode === -1) {
                                    $states[$ext] = [
                                        'state' => 'offline',
                                        'durationSec' => 0,
                                    ];
                                }
                            }
                        }
                    }

                    @fwrite($fp, "Action: Logoff\r\n\r\n");
                }
                @fclose($fp);
            }
        }

        // ادغام تماس‌های ثبت‌شده در کش سامانه (تنها در صورت عدم اتصال AMI یا برای چند ثانیه اول آغاز تماس)
        $cacheKey = 'blf_live_states_' . ($domainId ?: 'all');
        $cachedCalls = \Illuminate\Support\Facades\Cache::get($cacheKey, []);
        $cacheUpdated = false;
        $now = time();

        if (is_array($cachedCalls)) {
            foreach ($cachedCalls as $ext => $info) {
                if (isset($info['state']) && $info['state'] === 'busy') {
                    $createdAt = isset($info['timestamp']) ? (int)$info['timestamp'] : 0;
                    $age = $createdAt > 0 ? ($now - $createdAt) : 999;

                    if ($amiConnected) {
                        // در صورتی که اتصال زنده AMI برقرار باشد:
                        // وضعیت زنده استریسک معتبرترین منبع است.
                        // تنها در صورتی که تماس زیر ۶ ثانیه پیش آغاز شده باشد (تاخیر ایجاد کانال در استریسک)، موقتاً حفظ می‌شود.
                        if (isset($states[$ext]) && $states[$ext]['state'] !== 'busy') {
                            if ($age <= 6) {
                                $states[$ext] = [
                                    'state' => 'busy',
                                    'durationSec' => isset($info['durationSec']) ? $info['durationSec'] : 1,
                                    'callerNumber' => $info['callerNumber'] ?? null,
                                ];
                            } else {
                                // تماس در استریسک پایان یافته و خط آزاد است؛ کش بلافاصله پاک شود
                                unset($cachedCalls[$ext]);
                                $cacheUpdated = true;
                            }
                        }
                    } else {
                        // در صورت عدم دسترسی به AMI، حداکثر تا ۱۵ ثانیه در کش بماند
                        if ($age <= 15) {
                            $states[$ext] = [
                                'state' => 'busy',
                                'durationSec' => isset($info['durationSec']) ? $info['durationSec'] : 1,
                                'callerNumber' => $info['callerNumber'] ?? null,
                            ];
                        } else {
                            unset($cachedCalls[$ext]);
                            $cacheUpdated = true;
                        }
                    }
                }
            }

            if ($cacheUpdated) {
                \Illuminate\Support\Facades\Cache::put($cacheKey, $cachedCalls, 25);
            }
        }

        return response()->json([
            'status' => 'success',
            'ami_connected' => $amiConnected,
            'data' => $states,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'خطا در دریافت وضعیت خطوط: ' . $e->getMessage(),
            'data' => [],
        ], 500);
    }
});

Route::post('/blf/toggle-state', function (Request $request) {
    try {
        $extension = trim((string)$request->input('extension', ''));
        $state = $request->input('state');
        $domainId = $request->input('domain_id', 'all');

        if (empty($extension)) {
            return response()->json(['status' => 'error', 'message' => 'شماره داخلی الزامی است.'], 422);
        }

        $cacheKey = 'blf_live_states_' . ($domainId ?: 'all');
        $cached = \Illuminate\Support\Facades\Cache::get($cacheKey, []);
        $currentState = $cached[$extension]['state'] ?? 'idle';
        $newState = $state ?: ($currentState === 'busy' ? 'idle' : 'busy');

        $cached[$extension] = [
            'state' => $newState,
            'durationSec' => $newState === 'busy' ? 10 : 0,
            'callerNumber' => $newState === 'busy' ? 'مکالمه تستی' : null,
        ];

        \Illuminate\Support\Facades\Cache::put($cacheKey, $cached, 3600);

        return response()->json([
            'status' => 'success',
            'message' => "وضعیت داخلی {$extension} به «{$newState}» تغییر یافت.",
            'data' => $cached,
        ]);
    } catch (\Throwable $e) {
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
| ۵.۱. تست اتصال واقعی به سرور VoIP / Asterisk AMI ایزابل
|--------------------------------------------------------------------------
*/
Route::post('/domains/test-voip', function (Request $request) {
    $host = trim($request->input('host', ''));
    $port = (int)$request->input('port', 5038);
    $username = trim($request->input('username', ''));
    $secret = $request->input('secret');
    $domainId = $request->input('domain_id');

    // اگر سکرت در درخواست نبود و domain_id ارسال شده بود، از دیتابیس بخواند
    if (($secret === null || $secret === '') && !empty($domainId)) {
        $savedDomain = DB::table('ldap_domains')->where('id', $domainId)->first();
        if ($savedDomain) {
            $secret = $savedDomain->voip_ami_secret ?? '';
            if (empty($host)) $host = $savedDomain->voip_server_host ?? '';
            if (empty($port)) $port = (int)($savedDomain->voip_ami_port ?? 5038);
            if (empty($username)) $username = $savedDomain->voip_ami_username ?? '';
        }
    }

    if (empty($host)) {
        return response()->json([
            'status' => 'error',
            'message' => 'آدرس سرور ایزابل (IP یا Hostname) تعیین نشده است.'
        ], 422);
    }

    if (empty($username)) {
        return response()->json([
            'status' => 'error',
            'message' => 'نام کاربری AMI (Manager Username) الزامی است.'
        ], 422);
    }

    $startTime = microtime(true);
    $timeout = 4; // ثانیه
    $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);

    if (!$fp) {
        $latency = round((microtime(true) - $startTime) * 1000);
        return response()->json([
            'status' => 'error',
            'message' => "عدم امکان اتصال به سرویس AMI ایزابل در {$host}:{$port} - علت: " . ($errstr ?: "پورت در دسترس نیست یا فایروال مسدود است ($errno)"),
            'latencyMs' => $latency
        ], 500);
    }

    stream_set_timeout($fp, 4);

    // ۱. خواندن بنر اولیه استریسک (مثلاً Asterisk Call Manager/5.0.3)
    $banner = trim(fgets($fp, 1024));
    if (!str_contains($banner, 'Asterisk Call Manager')) {
        fclose($fp);
        $latency = round((microtime(true) - $startTime) * 1000);
        return response()->json([
            'status' => 'error',
            'message' => "سرویس روی پورت {$port} پاسخ استریسک استاندارد ارسال نکرد: {$banner}",
            'latencyMs' => $latency
        ], 500);
    }

    // ۲. ارسال پکت Login به AMI
    $loginPacket = "Action: Login\r\n" .
                   "Username: {$username}\r\n" .
                   "Secret: {$secret}\r\n\r\n";
    fwrite($fp, $loginPacket);

    // ۳. خواندن پاسخ احراز هویت از استریسک
    $responseLines = [];
    $authSuccess = false;
    $errorMessage = 'احراز هویت ناموفق بود.';

    while (!feof($fp)) {
        $line = trim(fgets($fp, 1024));
        if ($line === '') {
            break; // پایان بلوک پاسخ
        }
        $responseLines[] = $line;
        if (stripos($line, 'Response: Success') !== false) {
            $authSuccess = true;
        }
        if (stripos($line, 'Message:') === 0) {
            $msg = trim(substr($line, 8));
            if (!$authSuccess) {
                $errorMessage = $msg;
            }
        }
    }

    // ارسال خروج تمیز از سوکت
    @fwrite($fp, "Action: Logoff\r\n\r\n");
    @fclose($fp);

    $latency = round((microtime(true) - $startTime) * 1000);

    if (!$authSuccess) {
        return response()->json([
            'status' => 'error',
            'message' => "احراز هویت در سرویس AMI ایزابل ({$host}:{$port}) رد شد: {$errorMessage} (لطفاً نام کاربری و Secret را بررسی کنید)",
            'latencyMs' => $latency,
            'version' => $banner,
        ], 401);
    }

    return response()->json([
        'status' => 'success',
        'message' => "اتصال موفق به سرویس AMI ایزابل ({$banner}) در {$host}:{$port} با کاربر «{$username}» تأیید شد (Authentication Accepted).",
        'latencyMs' => $latency,
        'version' => $banner,
    ]);
});

/*
|--------------------------------------------------------------------------
| ۵.۲. برقراری تماس تلفنی (Click to Call / Asterisk Originate)
|--------------------------------------------------------------------------
*/
Route::post('/voip/originate', function (Request $request) {
    $callerExtension = trim($request->input('caller_extension', ''));
    $targetNumber = trim($request->input('target_number', ''));
    $targetName = trim($request->input('target_name', ''));
    $domainId = $request->input('domain_id');
    $host = trim($request->input('host', ''));
    $port = (int)$request->input('port', 5038);
    $username = trim($request->input('username', ''));
    $secret = $request->input('secret');
    $context = trim($request->input('context', 'from-internal'));
    $channelTech = trim($request->input('channel_tech', 'SIP'));
    $autoAnswer = (bool)$request->input('auto_answer', true);

    if (empty($callerExtension)) {
        return response()->json([
            'status' => 'error',
            'message' => 'شماره داخلی مبدأ (شماره رومیزی شما) مشخص نیست.'
        ], 422);
    }

    if (empty($targetNumber)) {
        return response()->json([
            'status' => 'error',
            'message' => 'شماره مقصد تماس مشخص نیست.'
        ], 422);
    }

    // لود تنظیمات از دیتابیس در صورت عدم ارسال در ریکوئست
    if (!empty($domainId) && (empty($host) || empty($username) || $secret === null || $secret === '')) {
        $savedDomain = DB::table('ldap_domains')->where('id', $domainId)->first();
        if ($savedDomain) {
            if (empty($host)) $host = $savedDomain->voip_server_host ?? '';
            if (empty($port)) $port = (int)($savedDomain->voip_ami_port ?? 5038);
            if (empty($username)) $username = $savedDomain->voip_ami_username ?? '';
            if ($secret === null || $secret === '') $secret = $savedDomain->voip_ami_secret ?? '';
            if (empty($context)) $context = $savedDomain->voip_context ?? 'from-internal';
            if (empty($channelTech)) $channelTech = $savedDomain->voip_channel_tech ?? 'SIP';
        }
    }

    if (empty($host) || empty($username)) {
        return response()->json([
            'status' => 'error',
            'message' => 'تنظیمات سرور VoIP برای دامین این کاربر ثبت نشده است.'
        ], 422);
    }

    $fp = @fsockopen($host, $port, $errno, $errstr, 4);
    if (!$fp) {
        return response()->json([
            'status' => 'error',
            'message' => "عدم امکان اتصال به سرور ایزابل در {$host}:{$port} ({$errstr})"
        ], 500);
    }

    stream_set_timeout($fp, 5);

    // ۱. خواندن بنر اولیه
    fgets($fp, 1024);

    // ۲. لاگین AMI
    $loginPacket = "Action: Login\r\n" .
                   "Username: {$username}\r\n" .
                   "Secret: {$secret}\r\n\r\n";
    fwrite($fp, $loginPacket);

    $authSuccess = false;
    while (!feof($fp)) {
        $line = trim(fgets($fp, 1024));
        if ($line === '') break;
        if (stripos($line, 'Response: Success') !== false) {
            $authSuccess = true;
        }
    }

    if (!$authSuccess) {
        @fwrite($fp, "Action: Logoff\r\n\r\n");
        @fclose($fp);
        return response()->json([
            'status' => 'error',
            'message' => 'احراز هویت در سرویس AMI ایزابل با نام کاربری یا Secret فعلی رد شد.'
        ], 401);
    }

    // ۳. ارسال پکت Originate
    $channel = "{$channelTech}/{$callerExtension}";
    $cleanTarget = preg_replace('/[^0-9]/', '', $targetNumber);
    $callId = 'originate_' . time() . '_' . mt_rand(1000, 9999);

    $originatePacket = "Action: Originate\r\n" .
                       "Channel: {$channel}\r\n" .
                       "Exten: {$cleanTarget}\r\n" .
                       "Context: {$context}\r\n" .
                       "Priority: 1\r\n" .
                       "CallerID: {$callerExtension} <{$callerExtension}>\r\n" .
                       "Timeout: 30000\r\n" .
                       "Async: true\r\n" .
                       "ActionID: {$callId}\r\n";

    if ($autoAnswer) {
        $originatePacket .= "Variable: __SIPADDHEADER=Call-Info: \\;answer-after=0\r\n";
        $originatePacket .= "Variable: __ALERT_INFO=Ring Answer\r\n";
    }
    $originatePacket .= "\r\n";

    fwrite($fp, $originatePacket);

    // خواندن پاسخ‌های بازگشتی AMI به بسته Originate
    $originateSuccess = false;
    $originateMessage = '';
    $rawResponses = [];

    // ممکن است چندین خط یا هدر و سپس خط خالی ارسال شود
    for ($i = 0; $i < 30 && !feof($fp); $i++) {
        $line = trim(fgets($fp, 1024));
        if ($line === '' && !empty($rawResponses)) {
            // یک بلوک پاسخ خوانده شد
            if ($originateSuccess || stripos(implode(' ', $rawResponses), 'Response: Error') !== false) {
                break;
            }
            continue;
        }
        if ($line !== '') {
            $rawResponses[] = $line;
            if (stripos($line, 'Response: Success') !== false) {
                $originateSuccess = true;
            }
            if (stripos($line, 'Message:') === 0) {
                $originateMessage = trim(substr($line, 8));
            }
        }
    }

    $rawText = implode(' ', $rawResponses);
    if (stripos($rawText, 'Response: Success') !== false || stripos($rawText, 'Originate successfully queued') !== false) {
        $originateSuccess = true;
    }

    @fwrite($fp, "Action: Logoff\r\n\r\n");
    @fclose($fp);

    if ($originateSuccess) {
        // ثبت در کش بلادرنگ خطوط جهت نمایش فوری وضعیت اشغالی در مانیتورینگ BLF
        $cacheKey = 'blf_live_states_' . ($domainId ?: 'all');
        $cached = \Illuminate\Support\Facades\Cache::get($cacheKey, []);
        $now = time();
        $cached[$callerExtension] = [
            'state' => 'busy',
            'durationSec' => 1,
            'callerNumber' => $targetNumber,
            'timestamp' => $now,
        ];
        if (!empty($targetNumber) && strlen($targetNumber) <= 5 && !str_starts_with($targetNumber, '0')) {
            $cached[$targetNumber] = [
                'state' => 'busy',
                'durationSec' => 1,
                'callerNumber' => $callerExtension,
                'timestamp' => $now,
            ];
        }
        \Illuminate\Support\Facades\Cache::put($cacheKey, $cached, 25);

        return response()->json([
            'status' => 'success',
            'message' => "دستور تماس به سرور VoIP ({$host}) ارسال شد. گوشی رومیزی شما ({$channel}) زنگ خواهد خورد.",
            'callId' => $callId,
        ]);
    } else {
        $cleanMsg = $originateMessage ?: 'عدم دریافت پاسخ معتبر از سرور VoIP';
        return response()->json([
            'status' => 'error',
            'message' => "خطا در ارسال دستور تماس به سرور VoIP: {$cleanMsg}"
        ], 500);
    }
});

/*
|--------------------------------------------------------------------------
| ۵.۳. قطع تماس تلفنی جاری از طریق وب (Hangup via AMI)
|--------------------------------------------------------------------------
*/
Route::post('/voip/hangup', function (Request $request) {
    $callerExtension = trim($request->input('caller_extension', ''));
    $domainId = $request->input('domain_id');
    $host = trim($request->input('host', ''));
    $port = (int)$request->input('port', 5038);
    $username = trim($request->input('username', ''));
    $secret = $request->input('secret');
    $channelTech = trim($request->input('channel_tech', 'SIP'));

    if (empty($callerExtension)) {
        return response()->json([
            'status' => 'error',
            'message' => 'شماره داخلی مشخص نیست.'
        ], 422);
    }

    if (!empty($domainId) && (empty($host) || empty($username) || $secret === null || $secret === '')) {
        $savedDomain = DB::table('ldap_domains')->where('id', $domainId)->first();
        if ($savedDomain) {
            if (empty($host)) $host = $savedDomain->voip_server_host ?? '';
            if (empty($port)) $port = (int)($savedDomain->voip_ami_port ?? 5038);
            if (empty($username)) $username = $savedDomain->voip_ami_username ?? '';
            if ($secret === null || $secret === '') $secret = $savedDomain->voip_ami_secret ?? '';
            if (empty($channelTech)) $channelTech = $savedDomain->voip_channel_tech ?? 'SIP';
        }
    }

    if (empty($host) || empty($username)) {
        return response()->json(['status' => 'error', 'message' => 'تنظیمات سرور VoIP ناقص است.'], 422);
    }

    $fp = @fsockopen($host, $port, $errno, $errstr, 3);
    if (!$fp) {
        return response()->json(['status' => 'error', 'message' => 'عدم دسترسی به سرور VoIP.'], 500);
    }

    stream_set_timeout($fp, 3);
    fgets($fp, 1024);

    $loginPacket = "Action: Login\r\n" .
                   "Username: {$username}\r\n" .
                   "Secret: {$secret}\r\n\r\n";
    fwrite($fp, $loginPacket);

    // بررسی لاگین
    $auth = false;
    while (!feof($fp)) {
        $l = trim(fgets($fp, 1024));
        if ($l === '') break;
        if (stripos($l, 'Response: Success') !== false) $auth = true;
    }

    if (!$auth) {
        @fclose($fp);
        return response()->json(['status' => 'error', 'message' => 'احراز هویت ناموفق'], 401);
    }

    // ابتدا لیست کانال‌ها را می‌گیریم تا نام دقیق کانال استریسک را بیابیم
    $reqId = 'chanlist_' . time();
    $chanPacket = "Action: CoreShowChannels\r\n" .
                  "ActionID: {$reqId}\r\n\r\n";
    fwrite($fp, $chanPacket);

    $channelsToHangup = [];
    while (!feof($fp)) {
        $l = trim(fgets($fp, 1024));
        if (stripos($l, 'EventList: Complete') !== false) break;
        if (stripos($l, 'Channel:') === 0) {
            $ch = trim(substr($l, 8));
            // اگر کانال مربوط به این داخلی باشد (مثلاً SIP/208-0000001a یا PJSIP/208-xxxx)
            if (preg_match('#(?:SIP|PJSIP)/' . preg_quote($callerExtension, '#') . '[-_]#i', $ch)) {
                $channelsToHangup[] = $ch;
            }
        }
    }

    // اگر از CoreShowChannels کانالی پیدا نشد، فرمت پیش‌فرض را امتحان می‌کنیم
    if (empty($channelsToHangup)) {
        $channelsToHangup[] = "{$channelTech}/{$callerExtension}";
    }

    $hungUpCount = 0;
    foreach ($channelsToHangup as $ch) {
        $hPacket = "Action: Hangup\r\n" .
                   "Channel: {$ch}\r\n\r\n";
        fwrite($fp, $hPacket);
        $hungUpCount++;
    }

    @fwrite($fp, "Action: Logoff\r\n\r\n");
    @fclose($fp);

    // پاکسازی وضعیت اشغال از کش BLF برای هر دو طرف تماس
    $cacheKey = 'blf_live_states_' . ($domainId ?: 'all');
    $cached = \Illuminate\Support\Facades\Cache::get($cacheKey, []);
    $modified = false;
    if (isset($cached[$callerExtension])) {
        $targetExt = $cached[$callerExtension]['callerNumber'] ?? null;
        unset($cached[$callerExtension]);
        if ($targetExt && isset($cached[$targetExt])) {
            unset($cached[$targetExt]);
        }
        $modified = true;
    }
    foreach ($cached as $k => $v) {
        if (($v['callerNumber'] ?? '') === $callerExtension || $k === $callerExtension) {
            unset($cached[$k]);
            $modified = true;
        }
    }
    if ($modified) {
        \Illuminate\Support\Facades\Cache::put($cacheKey, $cached, 25);
    }

    return response()->json([
        'status' => 'success',
        'message' => 'دستور قطع تماس به مرکز تلفن ارسال شد.',
        'hungUpCount' => $hungUpCount,
    ]);
});

/*
|--------------------------------------------------------------------------
| ۵.۴. استعلام زنده وضعیت کانال مکالمه داخلی (Active Call Check)
|--------------------------------------------------------------------------
*/
Route::post('/voip/channel-status', function (Request $request) {
    $callerExtension = trim($request->input('caller_extension', ''));
    $domainId = $request->input('domain_id');
    $host = trim($request->input('host', ''));
    $port = (int)$request->input('port', 5038);
    $username = trim($request->input('username', ''));
    $secret = $request->input('secret');

    if (empty($callerExtension)) {
        return response()->json(['active' => false]);
    }

    if (!empty($domainId) && (empty($host) || empty($username) || $secret === null || $secret === '')) {
        $savedDomain = DB::table('ldap_domains')->where('id', $domainId)->first();
        if ($savedDomain) {
            if (empty($host)) $host = $savedDomain->voip_server_host ?? '';
            if (empty($port)) $port = (int)($savedDomain->voip_ami_port ?? 5038);
            if (empty($username)) $username = $savedDomain->voip_ami_username ?? '';
            if ($secret === null || $secret === '') $secret = $savedDomain->voip_ami_secret ?? '';
        }
    }

    if (empty($host) || empty($username)) {
        return response()->json(['active' => false]);
    }

    $fp = @fsockopen($host, $port, $errno, $errstr, 2);
    if (!$fp) {
        return response()->json(['active' => false, 'error' => 'server_unreachable']);
    }

    stream_set_timeout($fp, 2);
    fgets($fp, 1024);

    $loginPacket = "Action: Login\r\n" .
                   "Username: {$username}\r\n" .
                   "Secret: {$secret}\r\n\r\n";
    fwrite($fp, $loginPacket);

    $auth = false;
    while (!feof($fp)) {
        $l = trim(fgets($fp, 1024));
        if ($l === '') break;
        if (stripos($l, 'Response: Success') !== false) $auth = true;
    }

    if (!$auth) {
        @fclose($fp);
        return response()->json(['active' => false, 'error' => 'auth_failed']);
    }

    $reqId = 'stat_' . time();
    $chanPacket = "Action: CoreShowChannels\r\n" .
                  "ActionID: {$reqId}\r\n\r\n";
    fwrite($fp, $chanPacket);

    $isActive = false;
    $channelName = null;
    $duration = 0;

    while (!feof($fp)) {
        $l = trim(fgets($fp, 1024));
        if (stripos($l, 'EventList: Complete') !== false) break;
        if (stripos($l, 'Channel:') === 0) {
            $ch = trim(substr($l, 8));
            if (preg_match('#(?:SIP|PJSIP)/' . preg_quote($callerExtension, '#') . '[-_]#i', $ch)) {
                $isActive = true;
                $channelName = $ch;
            }
        }
        if ($isActive && stripos($l, 'Duration:') === 0) {
            $duration = (int)trim(substr($l, 9));
        }
    }

    @fwrite($fp, "Action: Logoff\r\n\r\n");
    @fclose($fp);

    return response()->json([
        'active' => $isActive,
        'channel' => $channelName,
        'duration' => $duration,
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
