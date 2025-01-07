require("dotenv").config();
const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')

const app = express()
app.use(cors({
    
    origin:  ["http://localhost:3000","https://service-tracking.netlify.app"]

}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const db = mysql.createPool({
    connectionLimit: 20,
    host: process.env.HOST ,
    user: process.env.USER,
    password: process.env.MYSQL_P,
    database: process.env.DB,
    multipleStatements: true,
    // connectTimeout: 60000,
    timezone: 'utc',
    
})

db.getConnection((err, conn)=>{
    if(err){
        throw err
    }
    
    console.log("Connected!")
})
// db.connect((err)=>{
//     if(err) throw err
//     console.log("Connected!")
// })

app.get('/',(req,res)=>{
    res.status(200).json({message:"The server is working"})
})

//get all projects in home page
app.get('/all-projects', (req,res)=>{
    const sql = "SELECT projectID, projectName, currentPrice, DATE_FORMAT(lastPayment, '%d-%m-%Y') AS lastPayment, DATE_FORMAT(paymentRequest, '%d-%m-%Y') AS paymentRequest, nextPaymentTime, directDebits FROM projects;"
    // db.connect()
    db.query(sql,(err, data)=>{
        if(err){
            return res.json({message: "error", explan: err.message})
        }
        // console.log(data)
        return res.json({myData: data})
    })
})

//get only projects that have to pay this month

app.get('/pay-this-month', (req,res)=>{
    const monthNow = new Date().getMonth()
    const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקוטובר", "נובמבר", "דצמבר"];
    
    const sql = "SELECT projectID, projectName, DATE_FORMAT(paymentRequest, '%d-%m-%Y') AS paymentRequest, nextPaymentTime FROM projects;"
    db.query(sql, (err, data)=>{
        if(err){
            console.log(err);
            return res.json({message: "error", data:"err"})
        }else{
            const projects = data.filter((pro)=>
                pro.paymentRequest !== null && months[monthNow] === pro.nextPaymentTime
            ) 
            return res.json({message:'success', result: projects})
        }
    })

})

//create new project -> create new table
app.post('/new-project',(req,res)=>{
    const {projectID, projectName,startingPrice, installationDate, directDebits} = req.body

    ///
    console.log(req.body)
    const date = new Date(installationDate)
    date.setFullYear(date.getFullYear()+3)
    // [d,m,y]= date.toLocaleDateString().split('/')
    
    console.log(installationDate)
    console.log("first",directDebits)
    const sql = "INSERT INTO projects (projectID, projectName, startingPrice, installationDate, directDebits, firstPriceIncrease) VALUES (?);"
    db.query(sql,[[projectID, projectName, startingPrice, installationDate, directDebits, date]], (err, result)=>{
        if(err) return res.json({message: "Error:-"+err.message})
        const sql2= 'CREATE TABLE ?? (requestNum INT, requestDate DATE, quarterly VARCHAR(45), extra VARCHAR(45), requestAmount INT, paymentDate DATE, paymentAmount INT, invoiceNum INT, PRIMARY KEY(requestNum));'
        // console.log(sql2)
        db.query(sql2, [projectID] ,(err1, result1)=>{
            if(err1) return res.json({message: err1.message})
            return res.json({message: 'success'})

        })
        
    }) 
})
app.post('/project/update-installation-date', (req, res)=>{
    const {projectID, installationDate} = req.body

    const date = new Date(installationDate)
    date.setFullYear(date.getFullYear()+3)
    

    const sql = "UPDATE projects SET installationDate=?, firstPriceIncrease=? WHERE projectID=?;"

    db.query(sql,[installationDate,date,projectID],(err,result)=>{
        if(err) return res.json({message: "error"})
        return res.json({message:"success"})
    })

})

app.post('/project/update-price', (req,res)=>{
    const {projectID, price} = req.body
    const sql = "UPDATE projects SET startingPrice=? WHERE projectID=?;"
    db.query(sql,[price, projectID],(err,result)=>{
        if(err) return res.json({message: 'error'})
        return res.json({message:"succes"})
    })
})

app.post('/project/update-pay-by-direct-debit', (req,res)=>{
    const {projectID, directDebit} = req.body
    const sql = "UPDATE projects SET directDebits=? WHERE projectID=?;"
    db.query(sql,[directDebit, projectID],(err,result)=>{
        if(err) return res.json({message: 'error'})
        return res.json({message:"succes"})
    })
})



//get all row of project
app.get('/get-all-rows',(req,res)=>{
    const projectNum = req.query.projectNum
    // console.log("getAll",projectNum)
    const sql="SELECT * FROM ??;"
    db.query(sql,[projectNum, projectNum], (err,result)=>{
        if(err) return res.json({message: err.message})
        return res.json({result})
    })
})
app.get('/get-details',(req, res)=>{
    const projectNum = req.query.projectNum
    const sql = "SELECT startingPrice, DATE_FORMAT(installationDate, '%d-%m-%Y') AS installationDate, DATE_FORMAT(firstPriceIncrease, '%d-%m-%Y') AS firstPriceIncrease, DATE_FORMAT(lastPriceChangeDate, '%d-%m-%Y') AS lastPriceChangeDate, currentPrice FROM projects WHERE projectID =?;"
    
    db.query(sql,[projectNum],(err, result)=>{
        if(err){
            console.log(err)
             return res.json({message: err })}
        else{
            // console.log(result[0].installationDate)
            return res.json({result})
    }
        
    })

})
//add new payment request
app.post('/add-new-request',(req,res)=>{
    const {projectNum, requestNum, requestDate, quarterly, extra, requestAmount} = req.body

    console.log(quarterly)
    const sql = "INSERT INTO ?? (requestNum, requestDate, quarterly, extra, requestAmount) VALUES (?,?,?,?,?);"
    db.query(sql,[projectNum, requestNum, requestDate, quarterly, extra, requestAmount], (err,result)=>{
        if(err) {
            console.log(err)
            return res.json({message: "error"})}
        else if(quarterly !== "other"){
            console.log(quarterly)
            const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקוטובר", "נובמבר", "דצמבר"];
            const [,e] = quarterly.split("-")
            const sql2="UPDATE projects SET paymentRequest=?, nextPaymentTime=? WHERE projectID=?"
            db.query(sql2,[requestDate, months[e], projectNum],(error, ans)=>{
                if(error){
                    console.log(err)
                    return res.json({message: "error"})
                }
                console.log(ans);
                return res.json({message: "success"})
            })
        }
        else {
            console.log(quarterly)
            const sql3="UPDATE projects SET paymentRequest=? WHERE projectID=?"
            db.query(sql3,[requestDate, projectNum],(error, ans)=>{
                if(error){
                    console.log(err)
                    return res.json({message: "error"})
                }
                return res.json({message: "success"})
            })
        }
        
    })
})
app.post('/project/payment-date-update', (req,res)=>{
    const {projectNum,  requestNum ,paymentDate} = req.body
    const sql = "UPDATE ?? SET paymentDate=? WHERE requestNum=?;"
    console.log("request" ,requestNum)
    db.query(sql, [projectNum, paymentDate, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }else{
            const sql2 ="UPDATE projects SET lastPayment=? WHERE projectID=?; "
            db.query(sql2,[paymentDate, projectNum], (error, ans)=>{
                if(error){
                    console.log(error)
                    return res.json({message:'error'})
                }
                return res.json({message: 'success'})
            })
        }
        
    })
})
app.post('/new-debt',(req, res)=>{
    const newDebt = req.body
    const projectName = req.query.projectName
    const sql = "UPDATE projects SET debt=? WHERE projectID=?;"
    db.query(sql, [newDebt, projectName],(err, result)=>{
        if(err) return res.json({message: 'error'})
        return res.json({message: 'success'})
    })
})
app.post('/project/payment-amount-update', (req,res)=>{
    const {projectNum,  requestNum ,paymentAmount} = req.body
    const sql = "UPDATE ?? SET paymentAmount=? WHERE requestNum=?;"
    console.log("paymentAmount" ,paymentAmount)
    db.query(sql, [projectNum, paymentAmount, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }
        return res.json({message: 'success'})
    })
})

app.post('/project/update-date-send', (req,res)=>{
    const {projectNum,  requestNum ,dateSend} = req.body
    console.log(dateSend)
    const sql = "UPDATE ?? SET requestDate=? WHERE requestNum=?;"
    db.query(sql, [projectNum, dateSend, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }
        else{
            const sql2 = "UPDATE projects SET paymentRequest=? WHERE projectID=?;"
            db.query(sql2, [dateSend,projectNum],(err2,result2)=>{
                if(err2) return res.json({message: "error2"})
                else return res.json({message: 'success'})
            })
        }
        
    })
})

app.post('/project/update-request-amount', (req,res)=>{
    const {projectNum,  requestNum ,requestAmount} = req.body
    const sql = "UPDATE ?? SET requestAmount=? WHERE requestNum=?;"
    db.query(sql, [projectNum, requestAmount, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }
        return res.json({message: 'success'})
    })
})

app.post('/project/invoice-number', (req,res)=>{
    const {projectNum,  requestNum ,invoiceNum} = req.body
    const sql = "UPDATE ?? SET invoiceNum=? WHERE requestNum=?;"
    db.query(sql, [projectNum, invoiceNum, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }
        return res.json({message: 'success'})
    })
})

///
app.post('/projects/price-change',(req,res)=>{
    const {projectID,lastPriceChangeDate,currentPrice} = req.body
    //console.log(currentPrice)
    const sql = "UPDATE projects SET lastPriceChangeDate=?, currentPrice=? WHERE projectID=?;"
    db.query(sql, [lastPriceChangeDate, currentPrice, projectID], (err, result)=>{
        if(err) return res.json({message:"error"})
        //console.log(result)
        return res.json({message:"success"})
    })
})

//change last date that change price
app.post('/change-last-date',(req,res)=>{
    const projectNum = req.query.projectNum
    const lastDate = req.body.changeDate
    console.log(lastDate)
    const sql = "UPDATE projects SET lastPriceChangeDate=? WHERE projectID=?;"
    db.query(sql, [lastDate, projectNum], (err, result)=>{
        if(err){
             console.log(err.message)
             return res.json({message: 'error'})}
        
        return res.json({message: 'success'})
    })
})
// //change current price
// app.post('/change-price',(req,res)=>{
//     const projectNum = req.query.projectNum
//     const currentPrice = req.body.currentPrice
//     console.log("kk", currentPrice)
//     console.log("prp",projectNum)
//     const sql = "UPDATE projects SET currentPrice=? WHERE projectID=?;"
//     db.query(sql, [currentPrice, projectNum],(err,result)=>{
//         if(err) return res.json({message: "errror"})
//         return res.json({message:"success"})
//     })
// })

app.post('/project/update-extra', (req,res)=>{
    const {projectNum,  requestNum ,extra} = req.body
    const sql = "UPDATE ?? SET extra=? WHERE requestNum=?;"
    
    db.query(sql, [projectNum, extra, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }
        return res.json({message: 'success'})
    })
})
app.post('/project-passed/setPayment',(req,res)=>{
    const projectName = req.query.projectName
    const {tenantName, paymentDate, paymentAmount, invoiceNum} = req.body
    console.log(projectName,tenantName)
    const sql = "INSERT INTO ?? (tenantName, paymentDate, paymentAmount, invoiceNum) VALUES (?,?,?,?);"
    db.query(sql, [projectName, tenantName, paymentDate, paymentAmount, invoiceNum], (err,result)=>{
        if(err) return res.json({message: 'error'})
        else{
            const sql1= "UPDATE projectsPassedOnToUs SET lastPaymentDate=? WHERE projectName=?;"
            db.query(sql1, [paymentDate, projectName],(err1, res1)=>{
                if(err1) return res.json({message: "error"})
               return res.json({message: 'success'})
            })
        }
        
    })
})
// run all the time
app.get('/projects-passed-on-to-us',(req,res)=>{
    
    const sql = "SELECT projectID, projectName, monthlyPrice, DATE_FORMAT(lastPaymentDate, '%d-%m-%Y') AS lastPaymentDate from projectsPassedOnToUs;"

    db.query(sql,(err,result)=>{
        if(err){
            console.log(err);
             return res.json({message: "error"})}
        return res.json({message: 'success',result: result})
    })
})
app.post('/new-project-passed-our-service',(req,res)=>{
    const name = req.body.projectName
    
    const sql = "INSERT INTO projectsPassedOnToUs (projectName) VALUES (?);"
    db.query(sql ,[name], (err,result)=>{
        if(err) return res.json({message: 'error', explan: err})
        else{
            const sql2 = 'CREATE TABLE ?? (ID INT AUTO_INCREMENT, tenantName VARCHAR(45),paymentDate DATE, paymentAmount INT, invoiceNum INT, PRIMARY KEY(ID));'
            db.query(sql2, [name], (err2, result2)=>{
                if(err2) return res.json({massage: "error2"})
                return res.json({message: 'success'})
            })
        }
    })
})
app.get('/projects-passed/get-all-rows', (req,res)=>{
    const projectName = req.query.projectName
    const sql="SELECT * FROM ??;"
    db.query(sql,[projectName], (err,result)=>{
        if(err) return res.json({message: err.message})
        return res.json({result})
    }) 
})
app.post('/project-passed/last-date',(req,res)=>{
    const {projectName, lastPaymentDate} = req.body
    const sql = "UPDATE projectsPassedOnToUs SET lastPaymentDate=? WHERE projectName=?;"
    db.query(sql, [lastPaymentDate, projectName] ,(err, result)=>{
        if(err) return res.json({message: 'error'})
        return res.json({message:'success'})
    })
})
app.get('/projects/number-of-elevators',(req,res)=>{
    const sql = "SELECT (SELECT COUNT(*) FROM projects) AS count1, (SELECT COUNT(*) FROM projectsPassedOnToUs) AS count2 FROM dual;"
    db.query(sql,(err, result)=>{
        if(err) return res.json({message: 'error'})
        return res.json({result})
    })

})
app.listen(3002, console.log("Server is running..."))

