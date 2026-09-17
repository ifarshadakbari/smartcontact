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

    // تبدیل خودکار JSON به آرایه در PHP و بالعکس
    protected $casts = [
        'mobiles' => 'array',
        'landlines' => 'array',
        'is_favorite' => 'boolean',
        'is_public' => 'boolean',
        'display_order' => 'integer',
        'domain_id' => 'integer',
    ];

    public function favoritedByUsers()
    {
        return $this->belongsToMany(User::class, 'contact_favorites')->withTimestamps();
    }

    public function ldapDomain()
    {
        return $this->belongsTo(Department::class, 'domain_id'); // Or directly join ldap_domains
    }
}
