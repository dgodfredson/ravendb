#include <windows.h>
#include <VersionHelpers.h>

#include "rvn.h"
#include "status_codes.h"
#include "internal_win.h"

typedef DWORD (WINAPI *pDiscardVirtualMemory)(PVOID, SIZE_T);

PRIVATE pDiscardVirtualMemory 
_discard_virtual_memory_func;

PRIVATE bool
_init_discard_virtual_memory_flag = false;

EXPORT int32_t
rvn_discard_virtual_memory(void* address, int64_t size, int32_t* detailed_error_code)
{    
    if (_init_discard_virtual_memory_flag == false)
    {        
        _discard_virtual_memory_func = (pDiscardVirtualMemory) GetProcAddress(
                GetModuleHandle(TEXT("kernel32.dll")),
                "DiscardVirtualMemory");
        _init_discard_virtual_memory_flag = true;
    }

    if (_discard_virtual_memory_func != NULL)
    {
        int32_t rc = _discard_virtual_memory_func(address, (size_t)size);
        if (rc != 0)
            *detailed_error_code = errno;
        return rc;
    }
    return 0;
}