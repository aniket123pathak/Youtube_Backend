 const asyncHandler = (requestHandler)=>{
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).
        catch( (err) => next(err) )
    }
}

export { asyncHandler }






// asynchandler ( async (req,res)=>{res.status(200).json({message : "ok"}  )
// const asyncHandler = (async (req,res)=>{res.status(200).json({message : "ok"})
// requestHandler = async (req,res)=>{res.status(200).json({message : "ok"}


// const asyncHandler = ()=>{}
// const asyncHandler = (function)=>{ aync()=>{} }
// const asyncHandler = (function)=>async(req,res,next)=>{}
/*
const asyncHandler = (fn)=>{async(req,res,next)=>{
    try {
        await fn(req,res)
    } catch (error) {
        res.status(err.code || 500).json({
            success : false,
            message : err.message
        })
    }
}}
*/