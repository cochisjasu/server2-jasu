Hola que tal compañero, esta guía tiene el objetivo de ayudarte con el proceso de documentación de codigo y ayudarte a facilitar la curva de aprendizaje que vas a tener a lo largo de tu estancia con este proyecto. Es muy importante que conozcas las normas y las reglas de documentacion de proyectos para que tambien puedas transmitir tu conocimiento a las personas que estarán despues de ti, recuerda que es una muy buena práctica es que tu código lo puedan entender más personas ademas de tí.

A continuación te describiremos las guias que debes seguir para poder documentar tu código y los estándares que debes aplicar para generar una excelente calidad técnica.

## JSDoc
`JSDoc` es una libreria de código abierto que nos provee de muchos beneficios al momento de generar documentación a partir de código. 

Si necesitas saber más sobre la herramienta, puedes visitar su página oficial dando click en el siguiente [link](https://jsdoc.app/).

## Clean jsdoc theme

[Template](https://github.com/ankitskvmdam/clean-jsdoc-theme)


## ¿Qué debo documentar?
Las carpetas con el código que debes documentar son:

- ***bin***: contiene los scripts de sincronizacion e inserciones con la base de datos.
- ***helpers***: Contiene funciones de uso general en la aplicación.
- ***lib***: Contiene toda la lógica de negocios de la aplicación.
- ***resolvers***: Contiene todos las funciones que resuelven las peticiones de GraphQL

## ¿Como genero la documentacion?
Este proyecto ya tiene instaladas las librerias necesarias para documentar de forma automatizada, no necesitas hacer ninguna configuracion adicional.

Para que puedas generar la documentación necesaria, necesitas ejecutar el siguiente comando: 
```npm
$ npx jsdoc -c jsdoc.json
```
Esto generará los archivos que se usan en formato de html dentro de la carpeta `docs`

## Reglas de documentacion efectiva
Para que puedas documentar de forma eficiente tu cófigo es importante que sigas las siguientes reglas.

### Anotaciones clave que debes usar
```JS
/**
 * @class: Hace referencia a la clase del bloque a documentar
 *
 * @module: Hace referencia a un modulo o conjunto de funcionalidades
 * @param: Hace referencia a los parámetros que recibe una función
 * @returns: Hace referencia a la respuesta de una función
 * 
 * @type: Hace referencia al tipo de dato de una constante o variable a documentar
 * 
*/
```

### Documentación en bloque
La documentación se tiene que generar en formato de bloque mediante los comentarios de varias lineas, ésto con la finalidad de aprovechar el uso de las anotaciones `@` de los comentarios de JS.

### Documentacion de variables y constantes
```JS
/**
 * Variable de ejemplo 
 * 
 * @type {Object}
 */
const variable = {}

/**
 * Variable del tipo entero
 * 
 * @type {Integer}
*/
const valor = 1;

/**
 * Variable del tipo String
 * 
 * @type {String}
*/
const cadena = 'Hola mundo';
```

### Documentación de funciones
```JS
/**
 * Mi función
 * 
 * @param {String} a Descripcion de la variable a que recibe
 * @param {String} b Descripcion de la variable b que recibe
 * @returns {String}
*/
const miFuncion = (a, b) => {
    // TODO: ...
}
```

### Documentacion de clases y sus métodos
```JS
/**
 * Descripcion breve de la clase
 * 
 * @class
 */
class Clase {

/**
   * Descripcion de la funcion que a ejecutar (procura ser breve y claro)
   * 
   * @param {Tipo} Parametro Describe un poco el/los parametros que recibe tu función
   * @returns {Object} No es necesario que describas lo que retorna tu función, solo el tipo de dato
   */ 
  static metodo = async parametro => {
    /// Logica de negocios
  };    
}
```

Recuerda que un código excelente es aquel que se puede interpretar de forma sencilla para muchos programadores.

"***We craft perfection***"
