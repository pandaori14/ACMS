<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use Auditable;

    /** Prefix aksi audit (mis. system.setting.updated). */
    protected string $auditActionPrefix = 'system.setting';

    protected $fillable = [
        'key',
        'group',
        'value',
        'type',
        'description',
    ];

    /**
     * Get setting value with local cache to avoid multiple queries per request.
     */
    protected static $cache = [];

    public static function getValue(string $key, $default = null)
    {
        if (array_key_exists($key, self::$cache)) {
            return self::$cache[$key];
        }

        $setting = self::where('key', $key)->first();

        if (! $setting) {
            self::$cache[$key] = $default;

            return $default;
        }

        $val = $setting->value;
        if ($setting->type === 'boolean') {
            $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
        } elseif ($setting->type === 'integer') {
            $val = (int) $val;
        }

        self::$cache[$key] = $val;

        return $val;
    }

    public static function clearCache()
    {
        self::$cache = [];
    }
}
