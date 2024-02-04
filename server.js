require("dotenv").config();
const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')

const app = express()
app.use(cors({
    AccessControlAllowOrigin:  "https://service-tracking.netlify.app"
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT
const db = mysql.createConnection({
    host: process.env.HOST ,
    user: process.env.USER,
    password: process.env.MYSQL_P,
    database: process.env.DB,
    multipleStatements: true,
    // connectTimeout: 60000,
    timezone: 'utc',
})

db.connect((err)=>{
    if(err) throw err
    console.log("Connected!")
})

app.get('/',(req,res)=>{
    res.status(200).json({message:"Hello World"})
})

//get all projects in home page
app.get('/all-projects', (req,res)=>{
    const sql = "SELECT * FROM projects;"
    db.query(sql,(err, data)=>{
        if(err){
            return res.json({message: "שגיאה"})
        }
        return res.json({myData: data})
    })
})
const DateFilter=(date)=>{
    const monthNew = new Date(date)
    monthNew.setMonth(monthNew.getMonth()+3)
    //console.log("zzz",monthNew.getMonth()+1)
    return monthNew.getMonth()+1
}
//get only projects that have to pay this month
app.get('/pay-this-month',(req,res)=>{
    const monthNow = new Date().getMonth() + 1
    const sql = "SELECT projectID, projectName, DATE_FORMAT(lastPayment, '%d-%m-%Y') AS lastPayment, DATE_FORMAT(paymentRequest,'%Y-%m-%d') AS paymentRequest FROM projects;"
    db.query(sql, (err, data)=>{
        if(err){
            return res.json({message: "error"})
        }
        else{
            console.log(data)
            
            const proj = data.filter((pro)=>
                pro.paymentRequest!==null && DateFilter(pro.paymentRequest) == monthNow)
            return res.json({message:'success', result: proj})
        }
    })
})

//create new project -> create new table
app.post('/new-project',(req,res)=>{
    const {projectID, projectName,startingPrice, installationDate, directDebits} = req.body
    ///
    const date = new Date(installationDate)
    date.setFullYear(date.getFullYear()+3)
    const [d,m,y]= date.toLocaleDateString().split('/')
    const firstPriceIncrease = y+"-"+m+"-"+d
    
    ///
    console.log(installationDate)
    console.log("first",directDebits)
    const sql = "INSERT INTO projects (projectID, projectName, startingPrice, installationDate, directDebits, firstPriceIncrease) VALUES (?);"
    db.query(sql,[[projectID, projectName, startingPrice, installationDate, directDebits, firstPriceIncrease]], (err, result)=>{
        if(err) return res.json({message: err})
        const sql2= 'CREATE TABLE ?? (requestNum INT, requestDate DATE, quarterly VARCHAR(45), extra VARCHAR(45), requestAmount INT, paymentDate DATE, paymentAmount INT, invoiceNum INT, PRIMARY KEY(requestNum));'
        console.log(sql2)
        db.query(sql2, [projectID] ,(err1, result1)=>{
            if(err1) return res.json({message: err1})
            return res.json({message: 'success'})

        })
        
    }) 
})



//get all row of project
app.get('/get-all-rows',(req,res)=>{
    const projectNum = req.query.projectNum
    // console.log("getAll",projectNum)
    const sql="SELECT * FROM ??;"
    db.query(sql,[projectNum, projectNum], (err,result)=>{
        if(err) return res.json({message: err})
        return res.json({result})
    })
})
app.get('/get-details',(req, res)=>{
    const projectNum = req.query.projectNum
    const sql = "SELECT startingPrice, DATE_FORMAT(installationDate, '%d-%m-%Y') AS installationDate, DATE_FORMAT(firstPriceIncrease, '%d-%m-%Y') AS firstPriceIncrease, DATE_FORMAT(lastPriceChangeDate, '%d-%m-%Y') AS lastPriceChangeDate, currentPrice FROM projects WHERE projectID =?;"
    
    db.query(sql,[projectNum],(err, result)=>{
        if(err){
            console.log(err.message)
             return res.json({message: err})}
        else{
            // console.log(result[0].installationDate)
            return res.json({result})
    }
        
    })

})
//add new payment request
app.post('/add-new-request',(req,res)=>{
    const {projectNum, requestNum, requestDate, quarterly, extra, requestAmount} = req.body
    //let projectNum = req.query.projectNum
    console.log(projectNum)
    const sql = "INSERT INTO ?? (requestNum, requestDate, quarterly, extra, requestAmount) VALUES (?,?,?,?,?);"
    db.query(sql,[projectNum, requestNum, requestDate, quarterly, extra, requestAmount], (err,result)=>{
        if(err) {
            console.log(err)
            return res.json({message: "error"})}
        else{
            const sql2="UPDATE projects SET paymentRequest=? WHERE projectID=?"
            db.query(sql2,[requestDate,projectNum],(error, ans)=>{
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
    const sql = "UPDATE ?? SET requestDate=? WHERE requestNum=?;"
    db.query(sql, [projectNum, dateSend, requestNum],(err, result)=>{
        if(err){
            console.log(err)
            return res.json({message: 'error'})
        }
        return res.json({message: 'success'})
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

//change last date that change price
app.post('/change-last-date',(req,res)=>{
    const projectNum = req.query.projectNum
    const lastDate = req.body
    console.log(lastDate)
    const sql = "UPDATE projects SET lastPriceChangeDate=? WHERE projectID=?;"
    db.query(sql, [lastDate, projectNum], (err, result)=>{
        if(err){
             console.log(err.message)
             return res.json({message: 'error'})}
        
        return res.json({message: 'success'})
    })
})
//change current price
app.post('/change-price',(req,res)=>{
    const projectNum = req.query.projectNum
    const currentPrice = req.body
    console.log("kk", currentPrice)
    const sql = "UPDATE projects SET currentPrice=? WHERE projectID=?;"
    db.query(sql, [currentPrice, projectNum],(err,result)=>{
        if(err) return res.json({message: "errror"})
        return res.json({message:"success"})
    })
})

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

app.listen(3002, console.log("Server is running..."))

