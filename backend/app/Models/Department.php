<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'domain_id',
        'sort_order',
    ];

    protected $appends = [
        'domain_name',
    ];

    public function getDomainNameAttribute()
    {
        if ($this->domain) {
            return $this->domain->display_name ?: $this->domain->name;
        }
        return null;
    }

    /**
     * ارتباط با دامین LDAP (اختیاری)
     */
    public function domain()
    {
        return $this->belongsTo(LdapDomain::class, 'domain_id');
    }

    /**
     * مخاطبین مرتبط با این واحد
     */
    public function contacts()
    {
        return $this->hasMany(Contact::class, 'department', 'name');
    }
}