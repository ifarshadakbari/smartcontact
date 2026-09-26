<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LdapDomain extends Model
{
    use HasFactory;

    protected $table = 'ldap_domains';

    protected $fillable = [
        'name',
        'display_name',
        'host',
        'port',
        'base_dn',
        'encryption',
        'bind_user',
        'bind_password',
        'user_filter',
        'is_default',
        'is_active',
        'voip_enabled',
        'voip_server_host',
        'voip_ami_port',
        'voip_ami_username',
        'voip_ami_secret',
        'voip_context',
        'voip_channel_tech',
        'voip_trunk_prefix',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'voip_enabled' => 'boolean',
        'port' => 'integer',
        'voip_ami_port' => 'integer',
    ];

    public function contacts()
    {
        return $this->hasMany(Contact::class, 'domain_id');
    }

    public function departments()
    {
        return $this->hasMany(Department::class, 'domain_id');
    }
}
