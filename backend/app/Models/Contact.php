<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'personnel_code',
        'prefix_title',
        'first_name',
        'last_name',
        'job_title',
        'department',
        'location',
        'mobiles',
        'landlines',
        'email',
        'description',
        'avatar',
        'contact_type',
        'domain',
        'domain_id',
        'is_favorite',
        'created_by_user_id',
        'is_public',
        'display_order',
    ];

    protected $appends = [
        'domain',
        'domain_name',
        'created_by_user_name',
    ];

    // تبدیل خودکار JSON به آرایه در PHP و بالعکس
    protected $casts = [
        'mobiles' => 'array',
        'landlines' => 'array',
        'is_favorite' => 'boolean',
        'is_public' => 'boolean',
        'display_order' => 'integer',
        'domain_id' => 'integer',
        'created_by_user_id' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function getCreatedByUserNameAttribute()
    {
        return $this->creator ? $this->creator->name : null;
    }

    public function favoritedByUsers()
    {
        return $this->belongsToMany(User::class, 'contact_favorites')->withTimestamps();
    }

    public function ldapDomain()
    {
        return $this->belongsTo(LdapDomain::class, 'domain_id');
    }

    /**
     * اکسسور سازگاری برای بازگرداندن نام FQDN دامین
     */
    public function getDomainAttribute()
    {
        return $this->ldapDomain ? $this->ldapDomain->name : null;
    }

    /**
     * اکسسور سازگاری برای بازگرداندن نام فارسی دامین
     */
    public function getDomainNameAttribute()
    {
        return $this->ldapDomain ? ($this->ldapDomain->display_name ?? $this->ldapDomain->name) : null;
    }

    /**
     * موتیتور برای تبدیل نام دامین ورودی به domain_id در صورت لزوم
     */
    public function setDomainAttribute($value)
    {
        if (!empty($value) && empty($this->attributes['domain_id'])) {
            $dom = LdapDomain::where('name', $value)
                ->orWhere('display_name', $value)
                ->orWhere('id', (string)$value)
                ->first();
            if ($dom) {
                $this->attributes['domain_id'] = $dom->id;
            }
        }
    }
}
