---
description: Utilize the power of TypeScript classes in your models
---

# Object Mapping

### What is a model

Let's suppose we have this structure for our document

```javascript
{
    name: "Alex Corvi",
    yearBorn: 1992,
    skills: [
        {
            tech: "Typescript",
            since: 2015 
        },
        {
            tech: "NodeJS",
            since: 2013
        },
        {
            tech: "HTML",
            since: 2011
        }
    ]
}
```

Out of the above document we can guess few things that aren't mentioned directly in document, like:

* The current age of Alex Covri
* His first name
* His last name
* How long he has been into web development
* Whether he knows some backend
* Whether he knows some frontend
* Whether he is a full stack developer

And we can translate those guesses into a \`get\` methods in a class, like this:

```javascript
interface Skill {
    tech: string;
    since: number;
}

class Developer extends BaseModel {
    name: string = "";
    yearBorn: number = 0;    
    skills: Skill[];
    
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
    
    get firstName() {
        return this.name.split(" ")[0]
    }
    
    
    get lastName() {
        return this.name.split(" ")[1]
    }
    
    get startedWithSkill() {
        let oldestTech = {
            tech: "",
            since: new Date().getFullYear()
        }
        this.skills.forEach(skill=>{
            if(skill.since < oldestTech.since) {
                oldestTech = skill;
            }
        });
        return oldestTech;
    }
    
    get startedInYear() {
        return this.startedWithSkill.since;
    }
    
    get totalExperience() {
        return  new Date().getFullYear() - this.startedInYear;
    }
    
    get isFrontEndDev() {
        return !!this.skills.find(skill=>{
            return ["HTML", "CSS"].indexOf(skill.tech) !== -1
        });
    }
    
    get isBackEndDev() {
        return !!this.skills.find(skill=>{
            return ["NodeJS", "PHP"].indexOf(skill.tech) !== -1
        });
    }
    
    get isFullstackDev() {
        return this.isFrontEndDev && this.isBackEndDev;
    }
    
    setYearBornByAge(age: number) {
        this.yearBorn = new Date().getFullYear() - age;
    }
    
    makeFrontEnd(since: number) {
        this.skills.push({
            tech: "HTML",
            since
        },{
            tech: "CSS",
            since
        })
    }
}
```

The class above is called a **Model.**

In the class above, for any developer we can guess 9 properties out of 3 properties \(a total of 12 properties\). Also, we've written some methods that helps us in the editing of the developer properties. The possibilities are endless!

### Using `new` method

And since we're extending `BaseModel` we're also aided by a method called `new` which can help us create a new developer in a one liner

```javascript
let alex = Developer.new({
    name: "Alex Corvi",
    yearBorn: 1992
    // properties that are not
    // mentioned in this argument
    // will be the defaults defined
    // in the class above
});

// variable "alex" is a fully modeled
// accorcing to the given class above.
```

### Persisting and Mapping

When persisting data, the model will not be persisted, only the actual fields \(neither getters nor methods\) will be persisted.

![](.gitbook/assets/image%20%281%29.png)

### Querying and updating

You can query documents based on the getter properties like this

```javascript
db.find({filter: { isFullstackDev: true }})
```

but you can not update getter properties nor methods, and it would result in unexpected behaviors.

### Best practices

* Define computed getters instead of functions and methods.
* Always use `Model.new` to [create new documents](database-operations.md#database-insert).
* Use computed properties \(getter methods\) for [querying](database-operations.md#database-find).
* Define `createdAt` and `updatedAt` in your model when [you're using them](database-configurations.md#timestampdata) in you database.
* Never try to directly set a computed property or update it via the update operators.
* Use  `Model.new` in conjugation with the [upsert operator `$setOnInsert`](update-api.md#usdsetoninsert).
* Write computed properties \(getter methods\) to simplify your queries.

