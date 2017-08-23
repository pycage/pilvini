"use strict";

exports.LockStore = function()
{

    var that = this;
    
    that.SHARED_LOCK = 0;
    that.EXCLUSIVE_LOCK = 1;
    
    var m_lockMap = { };
    
    that.lock = function(resource, lockType, lifeTimeSeconds)
    {
        // create a unique lock token
        var lockToken = "urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6";
        
        return lockToken;
    };
    
    that.unlock = function(lockToken)
    {
        
    };
};
